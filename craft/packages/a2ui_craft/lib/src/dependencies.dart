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

import 'name_resolution.dart';
import 'rfw/model.dart';

/// Something a template library needs from the host (see the
/// `template_registry` blueprint, requirement 7).
sealed class Requirement {
  const Requirement();

  /// The JSON form used by the conformance cases.
  Map<String, Object?> toJson();
}

/// An import of the library that is not optional: the host must provide it.
final class ImportRequirement extends Requirement {
  /// Requires the host to provide [library].
  const ImportRequirement(this.library);

  /// The imported library.
  final LibraryName library;

  @override
  Map<String, Object?> toJson() => <String, Object?>{
    'import': library.toString(),
  };

  @override
  bool operator ==(Object other) =>
      other is ImportRequirement && other.library == library;

  @override
  int get hashCode => library.hashCode;

  @override
  String toString() => 'import $library';
}

/// A declared requirement, met when the matching introspection function,
/// called from the library, gives true.
sealed class HostRequirement extends Requirement {
  const HostRequirement(this.name, {this.arg});

  /// The widget or function name, as the library would write it.
  final String name;

  /// The argument the widget or function must have, or null.
  final String? arg;

  String get _kind;

  @override
  Map<String, Object?> toJson() => <String, Object?>{
    _kind: name,
    if (arg != null) 'arg': arg,
  };

  @override
  bool operator ==(Object other) =>
      other is HostRequirement &&
      other._kind == _kind &&
      other.name == name &&
      other.arg == arg;

  @override
  int get hashCode => Object.hash(_kind, name, arg);

  @override
  String toString() => '$_kind $name${arg == null ? '' : '.args.$arg'}';
}

/// Met when `hasWidget(name)`, or `hasWidgetArg(name, arg)` when [arg] is
/// given, is true.
final class WidgetRequirement extends HostRequirement {
  /// Requires the widget [name], with the argument [arg] if given.
  const WidgetRequirement(super.name, {super.arg});

  @override
  String get _kind => 'widget';
}

/// Met when `hasFunction(name)`, or `hasFunctionArg(name, arg)` when [arg] is
/// given, is true.
final class FunctionRequirement extends HostRequirement {
  /// Requires the function [name], with the argument [arg] if given.
  const FunctionRequirement(super.name, {super.arg});

  @override
  String get _kind => 'function';
}

/// What a template library declares it needs from the host, beyond its
/// imports: every import is required unless listed in [optional].
class LibraryDependencies {
  /// Declares the [optional] imports, the requirements of the whole library
  /// ([requires]) and those of single components ([components]).
  const LibraryDependencies({
    this.optional = const <LibraryName>{},
    this.requires = const <HostRequirement>[],
    this.components = const <String, List<HostRequirement>>{},
  });

  /// The imports the library can do without.
  final Set<LibraryName> optional;

  /// Requirements of every component of the library.
  final List<HostRequirement> requires;

  /// Requirements of single components, by component name.
  final Map<String, List<HostRequirement>> components;

  /// An unmodifiable copy of this declaration, for [library] registered as
  /// [name].
  ///
  /// Throws an [ArgumentError] unless every optional library is an import of
  /// [library], every key of [components] names one of its exported
  /// declarations, and no widget requirement is qualified with [name] (the
  /// library's own declarations never meet a requirement).
  LibraryDependencies checkedCopy(
    LibraryName name,
    RemoteWidgetLibrary library,
  ) {
    final LibraryDependencies copy = LibraryDependencies(
      optional: Set<LibraryName>.unmodifiable(optional),
      requires: List<HostRequirement>.unmodifiable(requires),
      components: Map<String, List<HostRequirement>>.unmodifiable(
        <String, List<HostRequirement>>{
          for (final MapEntry<String, List<HostRequirement>> c
              in components.entries)
            c.key: List<HostRequirement>.unmodifiable(c.value),
        },
      ),
    );
    copy._check(name, library);
    return copy;
  }

  void _check(LibraryName name, RemoteWidgetLibrary library) {
    final Set<LibraryName> imports = <LibraryName>{
      for (final Import i in library.imports) i.name,
    };
    for (final LibraryName name in optional) {
      if (!imports.contains(name)) {
        throw ArgumentError.value(
          name,
          'optional',
          'An optional library must be an import of the library',
        );
      }
    }
    final Set<String> exported = <String>{
      for (final WidgetDeclaration d in library.widgets)
        if (d.exported) d.name,
    };
    for (final String name in components.keys) {
      if (!exported.contains(name)) {
        throw ArgumentError.value(
          name,
          'components',
          'Requirements can only be declared for an exported declaration',
        );
      }
    }
    for (final HostRequirement r in <HostRequirement>[
      ...requires,
      for (final List<HostRequirement> c in components.values) ...c,
    ]) {
      if (r is WidgetRequirement && splitQualifiedName(r.name).$1 == name) {
        throw ArgumentError.value(
          r.name,
          'requires',
          'A widget requirement cannot name the library itself',
        );
      }
    }
  }
}

/// Whether a component can be offered to the agent, and the requirements of
/// its own that the host does not meet.
class ComponentAvailability {
  /// Creates the availability of one component.
  const ComponentAvailability({required this.available, required this.unmet});

  /// Whether the component is offered to the agent.
  final bool available;

  /// The component's own requirements that are not met, in declared order.
  final List<HostRequirement> unmet;
}

/// The result of checking a library's dependencies against the host.
class LibraryAvailability {
  /// Creates the availability of a library.
  const LibraryAvailability({
    required this.available,
    required this.unmet,
    required this.components,
  });

  /// Whether the library's requirements are met.
  final bool available;

  /// The library's requirements that are not met: imports first, in import
  /// order, then declared requirements in declared order.
  final List<Requirement> unmet;

  /// Every component of the library, in declaration order.
  final Map<String, ComponentAvailability> components;
}
