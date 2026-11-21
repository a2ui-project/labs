// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import 'dependencies.dart';
import 'evaluator.dart';
import 'functions.dart';
import 'name_resolution.dart';
import 'rfw/model.dart';
import 'standard_functions.dart';

/// The runtime version that `runtimeVersion()` gives (see the
/// `craft_template_registry` blueprint, requirement 6).
const int craftRuntimeVersion = 1;

/// The names of the introspection functions, which the registry adds to the
/// standard functions.
const Set<String> introspectionFunctionNames = <String>{
  'hasWidget',
  'hasWidgetArg',
  'hasFunction',
  'hasFunctionArg',
  'hasArg',
  'meta',
  'runtimeVersion',
  'appVersion',
};

/// The libraries and functions an engine offers templates, and what follows
/// from them: name resolution, the function table, introspection, symbol
/// references and the availability of components (see the
/// `craft_template_registry` blueprint).
///
/// Every query reflects the current registrations: each change drops what
/// was derived from the previous ones.
class TemplateRegistry {
  /// Creates an empty registry that reports [appVersion] to templates.
  TemplateRegistry({String appVersion = ''}) : _appVersion = appVersion;

  final Map<LibraryName, WidgetLibrary> _libraries =
      <LibraryName, WidgetLibrary>{};
  final Map<LibraryName, LibraryDependencies> _dependencies =
      <LibraryName, LibraryDependencies>{};
  final Map<LibraryName, Map<String, LocalFunction>> _functionLibraries =
      <LibraryName, Map<String, LocalFunction>>{};
  Map<String, LocalFunction> _hostFunctions = <String, LocalFunction>{};
  final Map<LibraryName, FunctionRegistry> _functionTables =
      <LibraryName, FunctionRegistry>{};
  _Availability? _availability;

  /// Name resolution over the registered libraries.
  late final NameResolver resolver = NameResolver(_libraries);

  String _appVersion;

  /// The string that `appVersion()` gives.
  String get appVersion => _appVersion;
  set appVersion(String value) {
    _appVersion = value;
    _invalidate();
  }

  /// Registers the template library [library] as [name], replacing any
  /// library of that name, with its declared [dependencies].
  ///
  /// The registry keeps a copy of [dependencies] as they are now. Throws an
  /// [ArgumentError], leaving the registry unchanged, when they do not fit
  /// [library] (see [LibraryDependencies.checkedCopy]).
  void setTemplateLibrary(
    LibraryName name,
    RemoteWidgetLibrary library, {
    LibraryDependencies dependencies = const LibraryDependencies(),
  }) {
    final LibraryDependencies copy = dependencies.checkedCopy(name, library);
    _libraries[name] = library;
    _dependencies[name] = copy;
    _bumpGeneration(name);
    _invalidate();
  }

  /// Registers the primitives of [library] as [name], replacing any library
  /// of that name. The registry keeps a copy of the primitive names and their
  /// metadata as they are now.
  ///
  /// Throws an [ArgumentError], leaving the registry unchanged, when some
  /// metadata is not a value (see [toValue]).
  void setPrimitiveLibrary(LibraryName name, PrimitiveLibrary library) {
    final _PrimitiveSnapshot snapshot = _PrimitiveSnapshot.of(library);
    _libraries[name] = snapshot;
    _dependencies.remove(name);
    _bumpGeneration(name);
    _invalidate();
  }

  /// Removes the library [name]; returns whether one was registered.
  bool removeLibrary(LibraryName name) {
    _dependencies.remove(name);
    if (_libraries.remove(name) == null) return false;
    _bumpGeneration(name);
    _invalidate();
    return true;
  }

  final Map<LibraryName, int> _generations = <LibraryName, int>{};

  /// How many times a library was registered or removed under [name]: a
  /// runtime compares it to tell that a library was registered again, even
  /// as the same object.
  int generation(LibraryName name) => _generations[name] ?? 0;

  void _bumpGeneration(LibraryName name) =>
      _generations[name] = generation(name) + 1;

  /// Registers [functions], by bare name, as the host functions of [library]
  /// (`library::name`), replacing any previous functions of [library].
  ///
  /// Throws an [ArgumentError], leaving the registry unchanged, when a key
  /// would not be a valid host function key (see [FunctionRegistry]).
  void setHostFunctions(
    LibraryName library,
    Map<String, LocalFunction> functions,
  ) {
    FunctionRegistry(
      standard: const <String, LocalFunction>{},
      host: _qualify(library, functions),
    );
    _functionLibraries[library] = Map<String, LocalFunction>.of(functions);
    _rebuildHostFunctions();
  }

  /// Removes the host functions of [library]; returns whether it had any
  /// registration.
  bool removeHostFunctions(LibraryName library) {
    if (_functionLibraries.remove(library) == null) return false;
    _rebuildHostFunctions();
    return true;
  }

  static Map<String, LocalFunction> _qualify(
    LibraryName library,
    Map<String, LocalFunction> functions,
  ) => <String, LocalFunction>{
    for (final MapEntry<String, LocalFunction> f in functions.entries)
      '$library$qualifierSeparator${f.key}': f.value,
  };

  void _rebuildHostFunctions() {
    _hostFunctions = <String, LocalFunction>{
      for (final MapEntry<LibraryName, Map<String, LocalFunction>> library
          in _functionLibraries.entries)
        ..._qualify(library.key, library.value),
    };
    _invalidate();
  }

  void _invalidate() {
    resolver.invalidate();
    _functionTables.clear();
    _availability = null;
  }

  // --- Functions and evaluation ---------------------------------------------

  /// The functions a template in [library] can call: the standard functions,
  /// the introspection functions answering for [library], and the host
  /// functions.
  FunctionRegistry functionsFor(LibraryName library) =>
      _functionTables[library] ??= FunctionRegistry(
        standard: <String, LocalFunction>{
          ...standardFunctions,
          ..._introspection(library),
        },
        host: _hostFunctions,
      );

  bool _isRegistered(String key) =>
      standardFunctions.containsKey(key) ||
      introspectionFunctionNames.contains(key) ||
      _hostFunctions.containsKey(key);

  LocalFunction? _function(LibraryName from, String name) {
    final String? key = resolver.functionKey(from, name, _isRegistered);
    return key == null ? null : functionsFor(from)[key];
  }

  /// Classifies a call named [name], written in [library] inside
  /// [declaration], as [Evaluator.classify] does, with [functionsFor].
  CallKind classify(
    String name, {
    required LibraryName library,
    String? declaration,
  }) => Evaluator(
    resolver,
    functionsFor(library),
  ).classify(name, library: library, declaration: declaration);

  /// Evaluates [value], written in [library] inside [declaration], as
  /// [Evaluator.evaluate] does, with [functionsFor] and [readSymbol].
  Object evaluate(
    Object? value, {
    required LibraryName library,
    String? declaration,
    Object? args,
    Object? data,
    Object? state,
  }) =>
      Evaluator(resolver, functionsFor(library), symbols: readSymbol).evaluate(
        value,
        library: library,
        declaration: declaration,
        args: args,
        data: data,
        state: state,
      );

  // --- Host metadata ---------------------------------------------------------

  /// The metadata of the primitive that [name] denotes among [from]'s
  /// imports, or null when it denotes no primitive.
  Map<String, Object>? _primitiveMeta(LibraryName from, String name) {
    if (resolver.resolveImported(from, name) case ResolvedName(
      isPrimitive: true,
      :final LibraryName library,
      name: final String bare,
    )) {
      return (_libraries[library]! as _PrimitiveSnapshot).meta[bare];
    }
    return null;
  }

  static Map<String, Object> _functionMeta(
    LocalFunction function,
  ) => <String, Object>{
    'args': <String, Object>{
      for (final String parameter in function.arguments.keys) parameter: true,
    },
  };

  /// The value of the symbol reference [reference] written in [from]: the
  /// metadata of the primitive or function its symbol denotes, read at its
  /// parts, or absent.
  Object readSymbol(LibraryName from, SymbolReference reference) {
    final Object? meta = switch (resolver.resolveImported(
      from,
      reference.symbol,
    )) {
      ResolvedName() => _primitiveMeta(from, reference.symbol),
      UnresolvedName() => switch (_function(from, reference.symbol)) {
        final LocalFunction function => _functionMeta(function),
        null => null,
      },
    };
    return _read(meta, reference.parts);
  }

  /// [root] read part by part: a string part reads a map's key, an integer
  /// part a list's index; absent when a part reads nothing.
  static Object _read(Object? root, Iterable<Object> parts) {
    Object? current = root;
    for (final Object part in parts) {
      current = switch ((current, part)) {
        (final Map<String, Object> map, final String key) => map[key],
        (final List<Object> list, final int index)
            when index >= 0 && index < list.length =>
          list[index],
        _ => null,
      };
    }
    return current ?? missing;
  }

  static final RegExp _index = RegExp(r'^(0|[1-9][0-9]*)$');

  /// [root] read along [path], a `.`-separated string: each segment reads a
  /// map's key, or a list's index when it is a decimal number without leading
  /// zeros; absent when a segment reads nothing. The whole of [root] when
  /// [path] is absent or empty.
  static Object _readPath(Object? root, Object path) {
    Object? current = root;
    if (path is String && path.isNotEmpty) {
      for (final String segment in path.split('.')) {
        current = switch (current) {
          final Map<String, Object> map => map[segment],
          final List<Object> list when _index.hasMatch(segment) =>
            switch (int.tryParse(segment)) {
              final int index when index < list.length => list[index],
              _ => null,
            },
          _ => null,
        };
      }
    }
    return current ?? missing;
  }

  // --- Introspection ---------------------------------------------------------

  bool _hasWidget(LibraryName from, String name, _Availability state) =>
      switch (resolver.resolveImported(from, name)) {
        ResolvedName(isPrimitive: true) => true,
        ResolvedName(:final LibraryName library, name: final String bare) =>
          state.componentAvailable(library, bare),
        UnresolvedName() => false,
      };

  bool _hasWidgetArg(LibraryName from, String widget, String arg) {
    final Object value = _read(_primitiveMeta(from, widget), <Object>[
      'args',
      arg,
    ]);
    return value is! Missing && value != false;
  }

  bool _hasFunctionArg(LibraryName from, String function, String arg) =>
      _function(from, function)?.arguments.containsKey(arg) ?? false;

  Map<String, LocalFunction> _introspection(LibraryName from) {
    const FunctionArgType text = FunctionArgType.string;
    LocalFunction function(
      Map<String, FunctionArgType> parameters,
      Object Function(DynamicMap arguments) implementation,
    ) => LocalFunction(arguments: parameters, implementation: implementation);
    return <String, LocalFunction>{
      'hasWidget': function(
        const <String, FunctionArgType>{'name': text},
        (DynamicMap a) => switch (a['name']) {
          final String name => _hasWidget(from, name, _state),
          _ => false,
        },
      ),
      'hasWidgetArg': function(
        const <String, FunctionArgType>{'widget': text, 'arg': text},
        (DynamicMap a) => switch ((a['widget'], a['arg'])) {
          (final String widget, final String arg) => _hasWidgetArg(
            from,
            widget,
            arg,
          ),
          _ => false,
        },
      ),
      'hasFunction': function(
        const <String, FunctionArgType>{'name': text},
        (DynamicMap a) => switch (a['name']) {
          final String name => _function(from, name) != null,
          _ => false,
        },
      ),
      'hasFunctionArg': function(
        const <String, FunctionArgType>{'function': text, 'arg': text},
        (DynamicMap a) => switch ((a['function'], a['arg'])) {
          (final String fn, final String arg) => _hasFunctionArg(from, fn, arg),
          _ => false,
        },
      ),
      'hasArg': function(
        const <String, FunctionArgType>{
          'widget': text,
          'function': text,
          'name': text,
          'arg': text,
        },
        (DynamicMap a) =>
            switch ((a['widget'], a['function'], a['name'], a['arg'])) {
              (final String w, _, _, final String arg) => _hasWidgetArg(
                from,
                w,
                arg,
              ),
              (_, final String f, _, final String arg) => _hasFunctionArg(
                from,
                f,
                arg,
              ),
              (_, _, final String n, final String arg) =>
                _hasWidgetArg(from, n, arg) || _hasFunctionArg(from, n, arg),
              _ => false,
            },
      ),
      'meta': function(
        const <String, FunctionArgType>{'w': text, 'f': text, 'path': text},
        (DynamicMap a) => switch ((a['w'], a['f'])) {
          (final String w, _) => _readPath(_primitiveMeta(from, w), a['path']!),
          (_, final String f) => _readPath(switch (_function(from, f)) {
            final LocalFunction fn => _functionMeta(fn),
            null => null,
          }, a['path']!),
          _ => missing,
        },
      ),
      'runtimeVersion': function(
        const <String, FunctionArgType>{},
        (DynamicMap a) => craftRuntimeVersion,
      ),
      'appVersion': function(
        const <String, FunctionArgType>{},
        (DynamicMap a) => _appVersion,
      ),
    };
  }

  // --- Dependencies ----------------------------------------------------------

  _Availability get _state => _availability ??= _computeAvailability();

  /// Whether the host provides the library [name] to an importing library.
  bool _provides(LibraryName name, _Availability state) =>
      _functionLibraries.containsKey(name) ||
      switch (_libraries[name]) {
        PrimitiveLibrary() => true,
        RemoteWidgetLibrary() => !state.libraries.contains(name),
        _ => false,
      };

  bool _meets(LibraryName from, HostRequirement r, _Availability state) =>
      switch ((r, r.arg)) {
        (WidgetRequirement(), null) => _hasWidget(from, r.name, state),
        (WidgetRequirement(), final String arg) => _hasWidgetArg(
          from,
          r.name,
          arg,
        ),
        (FunctionRequirement(), null) => _function(from, r.name) != null,
        (FunctionRequirement(), final String arg) => _hasFunctionArg(
          from,
          r.name,
          arg,
        ),
      };

  List<Requirement> _libraryUnmet(
    LibraryName name,
    RemoteWidgetLibrary library,
    _Availability state,
  ) {
    final LibraryDependencies dependencies = _dependencies[name]!;
    return <Requirement>[
      for (final LibraryName import in <LibraryName>{
        for (final Import i in library.imports) i.name,
      })
        if (!dependencies.optional.contains(import) &&
            !_provides(import, state))
          ImportRequirement(import),
      for (final HostRequirement r in dependencies.requires)
        if (!_meets(name, r, state)) r,
    ];
  }

  List<HostRequirement> _componentUnmet(
    LibraryName name,
    String component,
    _Availability state,
  ) => <HostRequirement>[
    for (final HostRequirement r
        in _dependencies[name]!.components[component] ??
            const <HostRequirement>[])
      if (!_meets(name, r, state)) r,
  ];

  Iterable<String> _components(RemoteWidgetLibrary library) => <String>[
    for (final WidgetDeclaration d in library.widgets)
      if (d.exported) d.name,
  ];

  // The largest set of available libraries and components whose
  // requirements all hold against that same set: start from everything and
  // remove what fails until nothing changes. Requirements only get harder to
  // meet as the set shrinks, so this terminates.
  _Availability _computeAvailability() {
    final _Availability state = _Availability();
    bool changed = true;
    while (changed) {
      changed = false;
      for (final MapEntry<LibraryName, WidgetLibrary> entry
          in _libraries.entries) {
        final (LibraryName name, WidgetLibrary library) = (
          entry.key,
          entry.value,
        );
        if (library is! RemoteWidgetLibrary) continue;
        if (!state.libraries.contains(name) &&
            _libraryUnmet(name, library, state).isNotEmpty) {
          state.libraries.add(name);
          changed = true;
        }
        for (final String component in _components(library)) {
          final FullyQualifiedWidgetName full = FullyQualifiedWidgetName(
            name,
            component,
          );
          if (!state.components.contains(full) &&
              _componentUnmet(name, component, state).isNotEmpty) {
            state.components.add(full);
            changed = true;
          }
        }
      }
    }
    return state;
  }

  /// Checks the dependencies of the library [name] against the host, or null
  /// when no library [name] is registered. A primitive library has no
  /// dependencies, and each of its primitives is an available component.
  LibraryAvailability? availability(LibraryName name) {
    final _Availability state = _state;
    switch (_libraries[name]) {
      case final PrimitiveLibrary library:
        return LibraryAvailability(
          available: true,
          unmet: const <Requirement>[],
          components: <String, ComponentAvailability>{
            for (final String primitive in library.widgetNames)
              primitive: const ComponentAvailability(
                available: true,
                unmet: <HostRequirement>[],
              ),
          },
        );
      case final RemoteWidgetLibrary library:
        final List<Requirement> unmet = _libraryUnmet(name, library, state);
        return LibraryAvailability(
          available: unmet.isEmpty,
          unmet: unmet,
          components: <String, ComponentAvailability>{
            for (final String component in _components(library))
              component: switch (_componentUnmet(name, component, state)) {
                final List<HostRequirement> own => ComponentAvailability(
                  available: unmet.isEmpty && own.isEmpty,
                  unmet: own,
                ),
              },
          },
        );
      case _:
        return null;
    }
  }

  /// The components of [catalog] offered to the agent: its available
  /// components (see [availability]), in declaration order. Empty when
  /// [catalog] is not registered.
  List<String> offeredComponents(LibraryName catalog) => <String>[
    for (final MapEntry<String, ComponentAvailability> c
        in availability(catalog)?.components.entries ??
            const <MapEntry<String, ComponentAvailability>>[])
      if (c.value.available) c.key,
  ];
}

/// The libraries and components found unavailable.
class _Availability {
  final Set<LibraryName> libraries = <LibraryName>{};
  final Set<FullyQualifiedWidgetName> components = <FullyQualifiedWidgetName>{};

  bool componentAvailable(LibraryName library, String component) =>
      !libraries.contains(library) &&
      !components.contains(FullyQualifiedWidgetName(library, component));
}

/// A copy of a host's primitive library: its names, and their metadata as
/// values.
class _PrimitiveSnapshot extends PrimitiveLibrary {
  _PrimitiveSnapshot(this.widgetNames, this.meta);

  factory _PrimitiveSnapshot.of(PrimitiveLibrary library) {
    final List<String> names = library.widgetNames.toSet().toList();
    final Map<String, Map<String, Object?>> source = library.widgetMeta;
    final Map<String, Map<String, Object>> meta =
        <String, Map<String, Object>>{};
    for (final String name in names) {
      try {
        meta[name] =
            toValue(source[name] ?? const <String, Object?>{})
                as Map<String, Object>;
      } on FormatException catch (error) {
        throw ArgumentError.value(
          name,
          'library',
          'The metadata of a primitive must be a value: ${error.message}',
        );
      }
    }
    return _PrimitiveSnapshot(names, meta);
  }

  @override
  final List<String> widgetNames;

  final Map<String, Map<String, Object>> meta;

  @override
  Map<String, Map<String, Object?>> get widgetMeta => meta;
}
