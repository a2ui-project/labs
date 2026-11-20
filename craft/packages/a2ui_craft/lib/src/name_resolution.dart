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

import 'rfw/model.dart';

/// Separates a library qualifier from a name: `core::Button`.
const String qualifierSeparator = '::';

/// The core library: its primitives and the standard functions are the only
/// imported names a template may use unqualified.
const LibraryName coreLibrary = LibraryName(<String>['core']);

/// Splits a possibly qualified name into its library and bare name. The
/// library is null for an unqualified name.
(LibraryName?, String) splitQualifiedName(String name) {
  final int at = name.indexOf(qualifierSeparator);
  if (at < 0) return (null, name);
  return (
    LibraryName(name.substring(0, at).split('.')),
    name.substring(at + qualifierSeparator.length),
  );
}

/// A host library of primitives as name resolution sees it: the names (and
/// static metadata) of what the host renders natively, without builders.
abstract class PrimitiveLibrary extends WidgetLibrary {
  /// Abstract const constructor.
  const PrimitiveLibrary();

  /// The names of the primitives this library defines.
  Iterable<String> get widgetNames;

  /// The static metadata of each primitive, keyed by name.
  Map<String, Map<String, Object?>> get widgetMeta;
}

/// The outcome of resolving a name.
sealed class NameResolution {
  const NameResolution();
}

/// The name denotes [name] in [library]: a [declaration] of a template
/// library, or a primitive when [declaration] is null.
final class ResolvedName extends NameResolution {
  const ResolvedName(this.library, this.name, this.declaration);

  /// The library that defines the widget.
  final LibraryName library;

  /// The bare widget name in [library].
  final String name;

  /// The template declaration, or null for a primitive.
  final WidgetDeclaration? declaration;

  /// Whether this is a primitive rather than a template.
  bool get isPrimitive => declaration == null;

  /// The fully qualified name.
  FullyQualifiedWidgetName get fullName =>
      FullyQualifiedWidgetName(library, name);
}

/// Why a name did not resolve.
enum UnresolvedReason {
  /// Nothing visible defines the name.
  notFound,

  /// Only imports other than `core` define the name, and it was not qualified.
  notQualified,

  /// The qualifier names a library that the calling library does not import.
  notImported,

  /// The name is a private (not exported) declaration of another library, or
  /// of the catalog.
  notExported,
}

/// The name could not be resolved.
final class UnresolvedName extends NameResolution {
  const UnresolvedName(
    this.reason,
    this.message, {
    this.candidates = const <LibraryName>[],
  });

  /// The kind of failure.
  final UnresolvedReason reason;

  /// An explanation for authors, suggesting a fix where there is one.
  final String message;

  /// For [UnresolvedReason.notQualified], the imports that define the name, in
  /// import order.
  final List<LibraryName> candidates;
}

/// Craft's name-resolution rules (see the `craft_libraries_and_names`
/// blueprint) over a set of registered libraries, shared by every runtime and
/// by tooling so that all of them agree on what a name denotes.
///
/// From a template library `L`, an unqualified name `N` resolves to `L`'s own
/// declaration of `N`, except the declaration being bound, and otherwise to
/// core's `N` when `L` imports `core`. Names from other imports must be
/// qualified (`maps::Map`), and imports are not transitive.
class NameResolver {
  /// Creates a resolver over [libraries], which it reads live; call
  /// [invalidate] after they change.
  NameResolver(this._libraries);

  final Map<LibraryName, WidgetLibrary> _libraries;

  // Keyed by (from, name, excluding); [_importedOnly] marks resolveImported.
  final Map<(LibraryName, String, String?), NameResolution> _cache =
      <(LibraryName, String, String?), NameResolution>{};
  static const String _importedOnly = '\u0000imported';

  /// Drops cached resolutions; call when any library changes.
  void invalidate() => _cache.clear();

  /// Resolves [name] as written in library [from]. [excluding] is the name of
  /// the declaration being bound in [from]: a declaration never resolves to
  /// itself, so `widget Button = Button(...)` wraps core's `Button`.
  NameResolution resolve(LibraryName from, String name, {String? excluding}) {
    return _cache[(from, name, excluding)] ??= _resolve(
      from,
      name,
      excluding: excluding,
      ownDeclarations: true,
    );
  }

  /// Resolves [name] among [from]'s imports only, as if [from] declared
  /// nothing: what the host and other libraries provide, not a template's own
  /// stand-in.
  NameResolution resolveImported(LibraryName from, String name) {
    return _cache[(from, name, _importedOnly)] ??= _resolve(
      from,
      name,
      excluding: null,
      ownDeclarations: false,
    );
  }

  NameResolution _resolve(
    LibraryName from,
    String name, {
    required String? excluding,
    required bool ownDeclarations,
  }) {
    final (LibraryName? qualifier, String bare) = splitQualifiedName(name);
    final WidgetLibrary? library = _libraries[from];
    final List<LibraryName> imports = _importsOf(from);
    if (qualifier != null) {
      if (qualifier != from && !imports.contains(qualifier)) {
        return UnresolvedName(
          UnresolvedReason.notImported,
          '$name: library $qualifier is not imported by $from. '
          'Add "import $qualifier;".',
        );
      }
      final bool hidden =
          qualifier == from && !ownDeclarations && library is! PrimitiveLibrary;
      final NameResolution? found = hidden
          ? null
          : _lookupIn(qualifier, bare, from: from, excluding: excluding);
      return found ??
          UnresolvedName(
            UnresolvedReason.notFound,
            _notFoundMessage(name, from, <LibraryName>[qualifier]),
          );
    }
    if (library is PrimitiveLibrary) {
      return _lookupIn(from, bare, from: from, excluding: null) ??
          UnresolvedName(
            UnresolvedReason.notFound,
            _notFoundMessage(name, from, const <LibraryName>[]),
          );
    }
    if (ownDeclarations) {
      if (_lookupIn(from, bare, from: from, excluding: excluding)
          case final NameResolution own) {
        return own;
      }
    }
    if (imports.contains(coreLibrary)) {
      if (_lookupIn(coreLibrary, bare, from: from, excluding: null)
          case final ResolvedName core) {
        return core;
      }
    }
    final List<LibraryName> candidates = <LibraryName>[
      for (final LibraryName import in imports.toSet())
        if (import != from &&
            _lookupIn(import, bare, from: from, excluding: null)
                is ResolvedName)
          import,
    ];
    if (candidates.isNotEmpty) {
      return UnresolvedName(
        UnresolvedReason.notQualified,
        '$bare comes from ${candidates.join(' and ')}; names from libraries '
        'other than core must be qualified, e.g. '
        '${candidates.first}$qualifierSeparator$bare.',
        candidates: candidates,
      );
    }
    return UnresolvedName(
      UnresolvedReason.notFound,
      _notFoundMessage(name, from, imports),
    );
  }

  /// Resolves [name] as a component of [catalog]: an exported declaration of
  /// [catalog] itself, never one of its private declarations or anything it
  /// imports. A primitive library used as a catalog exposes all its
  /// primitives.
  NameResolution resolveCatalogComponent(LibraryName catalog, String name) {
    final WidgetLibrary? library = _libraries[catalog];
    if (library is PrimitiveLibrary && library.widgetNames.contains(name)) {
      return ResolvedName(catalog, name, null);
    }
    if (library is RemoteWidgetLibrary) {
      for (final WidgetDeclaration declaration in library.widgets) {
        if (declaration.name != name) continue;
        return declaration.exported
            ? ResolvedName(catalog, name, declaration)
            : UnresolvedName(
                UnresolvedReason.notExported,
                '$name is private to catalog $catalog. Declare it as '
                '"export widget $name" to offer it as a component.',
              );
      }
    }
    return UnresolvedName(
      UnresolvedReason.notFound,
      'Catalog $catalog has no component named $name.',
    );
  }

  /// The key under which the function [name], as written in [from], is
  /// registered, or null when [from] cannot call it. [isRegistered] tells
  /// whether a key exists.
  ///
  /// Standard functions are registered unqualified and called as `add` or
  /// `core::add`. A host function of library `fmt` is registered as
  /// `fmt::price` and callable only as `fmt::price`, from a library that
  /// is or imports `fmt`. A key qualified with `core` is never callable:
  /// `core::x` always means the standard function `x`.
  String? functionKey(
    LibraryName from,
    String name,
    bool Function(String key) isRegistered,
  ) {
    final (LibraryName? qualifier, String bare) = splitQualifiedName(name);
    if (qualifier == null || qualifier == coreLibrary) {
      return isRegistered(bare) ? bare : null;
    }
    if (qualifier != from && !_importsOf(from).contains(qualifier)) return null;
    return isRegistered(name) ? name : null;
  }

  /// Every function name callable from [from] mapped to its registered key
  /// (see [functionKey]), given all registered keys.
  Map<String, String> visibleFunctions(
    LibraryName from,
    Iterable<String> registered,
  ) {
    final List<LibraryName> imports = _importsOf(from);
    return <String, String>{
      for (final String key in registered)
        ...switch (splitQualifiedName(key)) {
          (null, _) => <String, String>{
            key: key,
            '$coreLibrary$qualifierSeparator$key': key,
          },
          (final LibraryName library, _)
              when library != coreLibrary &&
                  (library == from || imports.contains(library)) =>
            <String, String>{key: key},
          _ => const <String, String>{},
        },
    };
  }

  /// Every widget name visible from [from] mapped to its resolution under
  /// exactly the rules of [resolve] (or [resolveImported] when
  /// [ownDeclarations] is false): for [from] and each of its imports, every
  /// name the library defines, both bare and qualified as `lib::Name`.
  Map<String, NameResolution> visibleNames(
    LibraryName from, {
    bool ownDeclarations = true,
  }) {
    NameResolution resolveName(String name) =>
        ownDeclarations ? resolve(from, name) : resolveImported(from, name);
    return <String, NameResolution>{
      for (final LibraryName scope in <LibraryName>[..._importsOf(from), from])
        for (final String name in _namesIn(scope)) ...<String, NameResolution>{
          '$scope$qualifierSeparator$name': resolveName(
            '$scope$qualifierSeparator$name',
          ),
          name: resolveName(name),
        },
    };
  }

  Iterable<String> _namesIn(LibraryName library) =>
      switch (_libraries[library]) {
        final RemoteWidgetLibrary lib => lib.widgets.map(
          (WidgetDeclaration d) => d.name,
        ),
        final PrimitiveLibrary lib => lib.widgetNames,
        _ => const <String>[],
      };

  List<LibraryName> _importsOf(LibraryName from) => switch (_libraries[from]) {
    final RemoteWidgetLibrary library => <LibraryName>[
      for (final Import i in library.imports) i.name,
    ],
    _ => const <LibraryName>[],
  };

  /// [name] as defined directly by [library] (never through its imports), seen
  /// from [from]: another library's private declaration is not visible, and
  /// [from]'s declaration named [excluding] is skipped. Null when [library]
  /// does not define [name].
  NameResolution? _lookupIn(
    LibraryName library,
    String name, {
    required LibraryName from,
    required String? excluding,
  }) {
    switch (_libraries[library]) {
      case final RemoteWidgetLibrary lib:
        for (final WidgetDeclaration declaration in lib.widgets) {
          if (declaration.name != name) continue;
          if (library == from) {
            if (name == excluding) continue;
          } else if (!declaration.exported) {
            return UnresolvedName(
              UnresolvedReason.notExported,
              '$name is private to library $library. Declare it as '
              '"export widget $name" to use it from $from.',
            );
          }
          return ResolvedName(library, name, declaration);
        }
      case final PrimitiveLibrary lib when lib.widgetNames.contains(name):
        return ResolvedName(library, name, null);
    }
    return null;
  }

  String _notFoundMessage(
    String name,
    LibraryName from,
    List<LibraryName> searched,
  ) {
    final List<LibraryName> missing = <LibraryName>[
      for (final LibraryName l in searched)
        if (!_libraries.containsKey(l)) l,
    ];
    return 'Could not find a widget named $name from $from'
        '${missing.isEmpty ? '' : ', possibly because these imported '
                  'libraries are not registered: ${missing.join(', ')}'}.';
  }
}
