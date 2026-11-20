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

/// Converts a library into its canonical JSON form (see the `craft_text_format`
/// blueprint).
///
/// Two libraries that mean the same thing have equal canonical forms,
/// whatever their origin and source locations. Conformance cases state
/// expected libraries in this form.
Map<String, Object?> canonicalLibrary(RemoteWidgetLibrary library) =>
    <String, Object?>{
      'imports': <Object?>[
        for (final Import import in library.imports) import.name.toString(),
      ],
      'widgets': <Object?>[
        for (final WidgetDeclaration widget in library.widgets)
          <String, Object?>{
            'name': widget.name,
            if (widget.exported) 'exported': true,
            if (widget.initialState != null)
              'state': canonicalValue(widget.initialState),
            'root': canonicalValue(widget.root),
          },
      ],
    };

/// Converts one value of a library into its canonical JSON form.
///
/// `null`, booleans and strings stay as they are, lists and maps are
/// converted element by element, and every other node becomes a map whose
/// `"$"` key names its kind.
Object? canonicalValue(Object? node) {
  return switch (node) {
    null || bool() || String() => node,
    int() => <String, Object?>{r'$': 'int', 'value': node},
    double() => <String, Object?>{r'$': 'double', 'value': node},
    Missing() => <String, Object?>{r'$': 'missing'},
    List<Object?>() => <Object?>[
      for (final Object? element in node) canonicalValue(element),
    ],
    Map<String, Object?>() => <String, Object?>{
      for (final MapEntry<String, Object?> entry in node.entries)
        entry.key: canonicalValue(entry.value),
    },
    ConstructorCall() => <String, Object?>{
      r'$': 'call',
      'name': node.name,
      'args': canonicalValue(node.arguments),
    },
    Switch() => <String, Object?>{
      r'$': 'switch',
      'input': canonicalValue(node.input),
      'cases': <Object?>[
        for (final MapEntry<Object?, Object> entry in node.outputs.entries)
          <String, Object?>{
            if (entry.key == null)
              'default': true
            else
              'key': canonicalValue(entry.key),
            'value': canonicalValue(entry.value),
          },
      ],
    },
    Loop() => <String, Object?>{
      r'$': 'loop',
      'input': canonicalValue(node.input),
      'output': canonicalValue(node.output),
    },
    WidgetBuilderDeclaration() => <String, Object?>{
      r'$': 'builder',
      'arg': node.argumentName,
      'widget': canonicalValue(node.widget),
    },
    EventHandler() => <String, Object?>{
      r'$': 'event',
      'name': node.eventName,
      'args': canonicalValue(node.eventArguments),
    },
    SetStateHandler() => <String, Object?>{
      r'$': 'setState',
      'target': canonicalValue(node.stateReference),
      'value': canonicalValue(node.value),
    },
    LoopReference() => _reference('loopRef', node.parts, <String, Object?>{
      'loop': node.loop,
    }),
    WidgetBuilderArgReference() => _reference(
      'builderArgRef',
      node.parts,
      <String, Object?>{'arg': node.argumentName},
    ),
    SymbolReference() => _reference('symbolRef', node.parts, <String, Object?>{
      'symbol': node.symbol,
    }),
    ArgsReference() => _reference('argsRef', node.parts),
    DataReference() => _reference('dataRef', node.parts),
    StateReference() => _reference('stateRef', node.parts),
    ThemeReference() => _reference('themeRef', node.parts),
    MediaReference() => _reference('mediaRef', node.parts),
    _ => throw ArgumentError.value(
      node,
      'node',
      'Not a library value (${node.runtimeType})',
    ),
  };
}

Map<String, Object?> _reference(
  String kind,
  List<Object> parts, [
  Map<String, Object?> extra = const <String, Object?>{},
]) => <String, Object?>{r'$': kind, ...extra, 'parts': parts};
