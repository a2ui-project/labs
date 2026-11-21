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

import 'dart:async';
import 'dart:convert';

import 'package:a2ui_core/a2ui_core.dart';
import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:a2ui_craft_flutter/a2ui_craft_flutter.dart';
import 'package:a2ui_flutter/a2ui_flutter.dart';
import 'package:flutter/widgets.dart';
import 'package:json_schema_builder/json_schema_builder.dart';

/// Receives an error of the template component [componentId]: an
/// `ExpansionError`, a `FireError` or a `MissingPrimitiveWidget`.
typedef TemplateErrorCallback = void Function(String componentId, Object error);

/// An A2UI v1.0 catalog [id] whose components are the components that
/// [registry] offers for the template library [library] (see the
/// `a2ui_integration` blueprint), with schemas derived from the templates.
///
/// Each component expands its template with the Flutter widgets of
/// [primitives]. [functions] are what dynamic values and `@checks` on these
/// components may call; the catalog is made from the registrations as they
/// are now.
CatalogImplementation templateCatalog({
  required String id,
  required TemplateRegistry registry,
  required LibraryName library,
  required Map<LibraryName, PrimitiveWidgetLibrary> primitives,
  List<FunctionImplementation> functions = const <FunctionImplementation>[],
  TemplateErrorCallback? onError,
}) => CatalogImplementation(
  id: id,
  protocolVersion: A2uiProtocolVersion.v1_0,
  functions: functions,
  components: <ComponentImplementation>[
    for (final MapEntry<String, TemplateInterface> c in templateInterfaces(
      registry,
      library,
    ).entries)
      ComponentImplementation(
        name: c.key,
        schema: Schema.fromMap(c.value.schema(c.key)),
        builder:
            (
              BuildContext context,
              ComponentNode<ComponentImplementation> node,
              ComponentProps props,
              ChildWidgetBuilder buildChild,
            ) => _TemplateComponent(
              template: _Template(
                registry,
                library,
                c.key,
                c.value,
                primitives,
                onError,
              ),
              node: node,
              props: props,
              buildChild: buildChild,
            ),
      ),
  ],
);

/// What every node of one template component shares.
class _Template {
  const _Template(
    this.registry,
    this.library,
    this.name,
    this.interface,
    this.primitives,
    this.onError,
  );

  final TemplateRegistry registry;
  final LibraryName library;
  final String name;
  final TemplateInterface interface;
  final Map<LibraryName, PrimitiveWidgetLibrary> primitives;
  final TemplateErrorCallback? onError;

  /// The arguments that [props] give (requirement 5).
  TemplateArgs args(ComponentProps props) => TemplateArgs.from(interface, {
    for (final String name in interface.properties.keys)
      if (_prop(props[name]) case final A2uiProp prop) name: prop,
    if (interface.checkable) ...<String, Object?>{
      'isValid': props['isValid'],
      'validationErrors': props['validationErrors'],
    },
  });

  static A2uiProp? _prop(Object? value) => switch (value) {
    final WritableBinding<Object?> b => BoundValue(
      b.value,
      path: b.path,
      host: b,
    ),
    final ResolvedBinding<Object?> b => BoundValue(b.value),
    final NodeAction action => ActionProp(action),
    final ComponentNode<ComponentImplementation> node => ChildProp(node),
    final List<Object?> list
        when list.every((Object? e) => e is ComponentNode) =>
      ChildListProp(<Object>[...list.cast<Object>()]),
    _ => null,
  };
}

/// One node of a template component: a runtime kept as long as the node,
/// rendered with [CraftView].
class _TemplateComponent extends StatefulWidget {
  const _TemplateComponent({
    required this.template,
    required this.node,
    required this.props,
    required this.buildChild,
  });

  final _Template template;
  final ComponentNode<ComponentImplementation> node;
  final ComponentProps props;
  final ChildWidgetBuilder buildChild;

  @override
  State<_TemplateComponent> createState() => _TemplateComponentState();
}

class _TemplateComponentState extends State<_TemplateComponent> {
  late TemplateArgs _args;
  late final CraftRuntime _runtime;

  @override
  void initState() {
    super.initState();
    _args = widget.template.args(widget.props);
    _runtime = CraftRuntime(
      widget.template.registry,
      library: widget.template.library,
      widget: widget.template.name,
      args: _args.args,
    );
  }

  @override
  void didUpdateWidget(_TemplateComponent oldWidget) {
    super.didUpdateWidget(oldWidget);
    final TemplateArgs next = widget.template.args(widget.props);
    final bool changed = _key(next) != _key(_args);
    _args = next;
    if (changed) _runtime.args = next.args;
  }

  static String _key(TemplateArgs args) =>
      jsonEncode(canonicalExpansionValue(args.args));

  void _onEvent(HostEvent event) {
    for (final A2uiEffect effect in _args.effects(event)) {
      switch (effect) {
        case DispatchAction():
          unawaited(
            A2uiSurface.of(
              context,
            ).dispatchAction(effect.payload, widget.node.componentId),
          );
        case RunAction(host: final NodeAction action):
          unawaited(action());
        case WriteData(host: final WritableBinding<Object?> binding):
          binding.set(effect.value);
        default:
      }
    }
  }

  @override
  Widget build(BuildContext context) => CraftView(
    runtime: _runtime,
    libraries: widget.template.primitives,
    onEvent: _onEvent,
    onError: switch (widget.template.onError) {
      final TemplateErrorCallback onError => (Object error) => onError(
        widget.node.componentId,
        error,
      ),
      null => null,
    },
    hostWidgetBuilder: (BuildContext context, HostWidgetNode node) =>
        switch (_args.widgets[node.id]) {
          final ComponentNode<ComponentImplementation> child =>
            widget.buildChild(child),
          _ => const SizedBox.shrink(),
        },
  );
}
