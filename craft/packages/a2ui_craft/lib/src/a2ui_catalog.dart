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

import 'evaluator.dart';
import 'name_resolution.dart';
import 'rfw/model.dart';
import 'template_registry.dart';

/// How a template uses one of its arguments, which decides the shape of the
/// matching property in its A2UI catalog schema (see the
/// `craft_a2ui_integration` blueprint, requirement 1).
enum ArgKind {
  /// Fired as a handler: an A2UI `Action`.
  action,

  /// Placed as a list of widgets: an A2UI `ChildList`.
  children,

  /// Placed as a widget: an A2UI `Child`.
  child,

  /// A string value: an A2UI `DynamicString`.
  string,

  /// A number value: an A2UI `DynamicNumber`.
  number,

  /// A boolean value: an A2UI `DynamicBoolean`.
  boolean,

  /// Any other value: an A2UI `DynamicValue`.
  value;

  /// Whether a property of this kind is a dynamic value, which A2UI can bind
  /// to a data path.
  bool get isValue => index >= ArgKind.string.index;

  /// The A2UI common type of a property of this kind.
  String get commonType => switch (this) {
    ArgKind.action => 'Action',
    ArgKind.children => 'ChildList',
    ArgKind.child => 'Child',
    ArgKind.string => 'DynamicString',
    ArgKind.number => 'DynamicNumber',
    ArgKind.boolean => 'DynamicBoolean',
    ArgKind.value => 'DynamicValue',
  };
}

/// The arguments that A2UI supplies from a component's check results.
const Set<String> checkResultArgs = <String>{'isValid', 'validationErrors'};

/// Arguments that are never A2UI properties: envelope keys, and check
/// results that are no values.
const Set<String> reservedArgs = <String>{
  'id',
  'component',
  'validationResults',
};

/// The two-way setter that A2UI supplies next to a path-bound [arg]: `set`
/// followed by [arg] with its first letter in upper case (`value` →
/// `setValue`).
String setterName(String arg) =>
    'set${arg.substring(0, 1).toUpperCase()}${arg.substring(1)}';

/// What an A2UI renderer offers a template as a catalog component: the
/// properties it takes and whether it takes `@checks`.
class TemplateInterface {
  /// Creates an interface.
  const TemplateInterface(this.properties, {required this.checkable});

  /// The properties by name.
  final Map<String, ArgKind> properties;

  /// Whether the template reads a check result ([checkResultArgs]).
  final bool checkable;

  /// The component schema of [component] in A2UI v1.0 catalog form.
  Map<String, Object?> schema(String component) => <String, Object?>{
    'type': 'object',
    'allOf': <Object?>[
      if (checkable) _commonType('Checkable'),
      <String, Object?>{
        'type': 'object',
        'properties': <String, Object?>{
          'component': <String, Object?>{'const': component},
          for (final MapEntry<String, ArgKind> p in properties.entries)
            p.key: _commonType(p.value.commonType),
        },
        'required': <Object?>['component'],
      },
    ],
  };

  static Map<String, Object?> _commonType(String name) => <String, Object?>{
    r'$ref': 'common_types.json#/\$defs/$name',
  };
}

/// The A2UI component schemas of the components that [registry] offers for
/// [library] (see `TemplateRegistry.offeredComponents`), by name, in order.
/// Empty when [library] is not a registered template library.
Map<String, Map<String, Object?>> templateCatalogSchemas(
  TemplateRegistry registry,
  LibraryName library,
) => <String, Map<String, Object?>>{
  for (final MapEntry<String, TemplateInterface> c in templateInterfaces(
    registry,
    library,
  ).entries)
    c.key: c.value.schema(c.key),
};

/// The interfaces of the components that [registry] offers for [library],
/// by name, in order. Empty when [library] is not a registered template
/// library.
Map<String, TemplateInterface> templateInterfaces(
  TemplateRegistry registry,
  LibraryName library,
) {
  final _ArgUses uses = _ArgUses(registry);
  return <String, TemplateInterface>{
    for (final String name in registry.offeredComponents(library))
      if (registry.resolver.resolveCatalogComponent(library, name)
          case final ResolvedName resolved when !resolved.isPrimitive)
        name: _interface(uses.of(resolved)),
  };
}

TemplateInterface _interface(Map<String, ArgKind> kinds) {
  bool isSetter(String arg) =>
      kinds[arg] == ArgKind.action &&
      kinds.entries.any(
        (MapEntry<String, ArgKind> p) =>
            p.value.isValue && setterName(p.key) == arg && !_excluded(p.key),
      );
  return TemplateInterface(<String, ArgKind>{
    for (final MapEntry<String, ArgKind> a in kinds.entries)
      if (!_excluded(a.key) && !isSetter(a.key)) a.key: a.value,
  }, checkable: kinds.keys.any(checkResultArgs.contains));
}

bool _excluded(String arg) =>
    reservedArgs.contains(arg) || checkResultArgs.contains(arg);

/// The kinds of the arguments that template declarations read.
class _ArgUses {
  _ArgUses(this.registry);

  final TemplateRegistry registry;
  final Map<FullyQualifiedWidgetName, Map<String, ArgKind>> _done =
      <FullyQualifiedWidgetName, Map<String, ArgKind>>{};
  final Set<FullyQualifiedWidgetName> _active = <FullyQualifiedWidgetName>{};

  /// How many calls to a template under analysis were met; a result that
  /// met one depends on the chain it was computed in, so it is not kept.
  int _cycles = 0;

  /// The kind of each argument that [template] reads, in the order of its
  /// first use.
  Map<String, ArgKind> of(ResolvedName template) {
    final FullyQualifiedWidgetName name = template.fullName;
    if (_done[name] case final Map<String, ArgKind> done) return done;
    _active.add(name);
    final int cycles = _cycles;
    final Map<String, List<ArgKind>> uses = <String, List<ArgKind>>{};
    _Walk(
      this,
      template.library,
      template.declaration!.name,
      uses,
    ).visit(template.declaration!.root, ArgKind.child);
    _active.remove(name);
    final Map<String, ArgKind> kinds = <String, ArgKind>{
      for (final MapEntry<String, List<ArgKind>> u in uses.entries)
        u.key: _join(u.value),
    };
    if (_cycles == cycles) _done[name] = kinds;
    return kinds;
  }

  /// The kind of a value passed as [arg] to [template]: the kind [template]
  /// gives [arg], or [ArgKind.value] when it does not read it or is being
  /// analyzed.
  ArgKind templateArg(ResolvedName template, String arg) {
    if (_active.contains(template.fullName)) {
      _cycles += 1;
      return ArgKind.value;
    }
    return of(template)[arg] ?? ArgKind.value;
  }

  /// The kind that the metadata of [primitive] gives [arg] under `args`.
  ArgKind primitiveArg(ResolvedName primitive, String arg) =>
      switch (registry.primitiveMeta(primitive.fullName)?['args']) {
        final Map<String, Object> args => switch (args[arg]) {
          'widget' => ArgKind.child,
          'widgets' => ArgKind.children,
          'handler' => ArgKind.action,
          'string' => ArgKind.string,
          'number' => ArgKind.number,
          'boolean' => ArgKind.boolean,
          _ => ArgKind.value,
        },
        _ => ArgKind.value,
      };

  /// The first of action, children and child among [uses]; otherwise the
  /// value type that all typed uses agree on, or [ArgKind.value].
  static ArgKind _join(List<ArgKind> uses) {
    for (final ArgKind k in <ArgKind>[
      ArgKind.action,
      ArgKind.children,
      ArgKind.child,
    ]) {
      if (uses.contains(k)) return k;
    }
    final Set<ArgKind> typed = uses.toSet()..remove(ArgKind.value);
    return typed.length == 1 ? typed.single : ArgKind.value;
  }
}

/// One walk over a declaration's root, recording each argument reference
/// with the kind of the position it is in.
class _Walk {
  _Walk(this.uses, this.library, this.declaration, this.found);

  final _ArgUses uses;
  final LibraryName library;
  final String declaration;
  final Map<String, List<ArgKind>> found;

  void _record(String arg, ArgKind kind) =>
      (found[arg] ??= <ArgKind>[]).add(kind);

  void visit(Object? node, ArgKind position) {
    switch (node) {
      case ArgsReference(parts: [final String arg, ...final List<Object> rest]):
        _record(arg, rest.isEmpty ? position : ArgKind.value);
      case List<Object?>():
        final ArgKind element = switch (position) {
          ArgKind.children => ArgKind.child,
          ArgKind.action => ArgKind.action,
          _ => ArgKind.value,
        };
        for (final Object? e in node) {
          if (e is Loop) {
            _loop(e, element);
          } else {
            visit(e, element);
          }
        }
      case Map<String, Object?>():
        for (final Object? v in node.values) {
          visit(v, ArgKind.value);
        }
      case ConstructorCall():
        _call(node);
      case Switch():
        visit(node.input, ArgKind.value);
        for (final MapEntry<Object?, Object> c in node.outputs.entries) {
          visit(c.key, ArgKind.value);
          visit(c.value, position);
        }
      case Loop():
        visit(node.input, ArgKind.value);
        visit(node.output, ArgKind.value);
      case WidgetBuilderDeclaration():
        visit(node.widget, ArgKind.child);
      case EventHandler():
        visit(node.eventArguments, ArgKind.value);
      case SetStateHandler():
        visit(node.value, ArgKind.value);
    }
  }

  /// A loop that is a list element at [element]: `...for x in args.a: x`
  /// gives `a` the list form of [element]; anything else is visited.
  void _loop(Loop loop, ArgKind element) {
    if ((loop.input, loop.output) case (
      ArgsReference(parts: [final String arg]),
      LoopReference(loop: 0, parts: []),
    )) {
      _record(arg, switch (element) {
        ArgKind.child => ArgKind.children,
        ArgKind.action => ArgKind.action,
        _ => ArgKind.value,
      });
      return;
    }
    visit(loop.input, ArgKind.value);
    visit(loop.output, element);
  }

  void _call(ConstructorCall call) {
    final CallKind kind = uses.registry.classify(
      call.name,
      library: library,
      declaration: declaration,
    );
    for (final MapEntry<String, Object?> a in call.arguments.entries) {
      visit(a.value, switch (kind) {
        WidgetCall(widget: final ResolvedName w) when w.isPrimitive =>
          uses.primitiveArg(w, a.key),
        WidgetCall(widget: final ResolvedName w) => uses.templateArg(w, a.key),
        HandlerApplication() when a.key == 'handler' => ArgKind.action,
        _ => ArgKind.value,
      });
    }
  }
}
