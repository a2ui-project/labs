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

// Unit tests of the limits feature that the shared conformance cases cannot
// express: inputs at the engine's default limits that used to overflow the
// stack, and the Dart API.

import 'dart:typed_data';

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:test/test.dart';

const LibraryName _main = LibraryName(<String>['main']);
const LibraryName _core = LibraryName(<String>['core']);

class _Core extends PrimitiveLibrary {
  @override
  Map<String, Map<String, Object?>> get widgetMeta =>
      const <String, Map<String, Object?>>{
        'Text': <String, Object?>{},
        'Button': <String, Object?>{},
        'List': <String, Object?>{},
      };

  @override
  Iterable<String> get widgetNames => widgetMeta.keys;
}

TemplateRegistry _registry(String source, {CraftLimits? limits}) =>
    TemplateRegistry(limits: limits)
      ..setPrimitiveLibrary(_core, _Core())
      ..setTemplateLibrary(_main, parseLibraryFile(source, limits: limits));

Object _nestedList(int depth) {
  Object value = 1;
  for (int i = 0; i < depth; i += 1) {
    value = <Object>[value];
  }
  return value;
}

Matcher _limit(CraftLimit limit) => anyOf(
  isA<ParserException>().having((ParserException e) => e.limit, 'limit', limit),
  isA<BlobFormatException>().having(
    (BlobFormatException e) => e.limit,
    'limit',
    limit,
  ),
  isA<CraftLimitException>().having(
    (CraftLimitException e) => e.limit,
    'limit',
    limit,
  ),
);

void main() {
  group('deep input at the default limits fails cleanly', () {
    const int depth = 10000;

    test('a deeply nested source', () {
      final String list = '${'[' * depth}1${']' * depth}';
      expect(
        () => parseLibraryFile('widget A = Text(text: $list);'),
        throwsA(_limit(CraftLimit.maxDepth)),
      );
      expect(
        () => parseDataFile('{a: $list}'),
        throwsA(_limit(CraftLimit.maxDepth)),
      );
    });

    test('a data blob of 10,000 nested lists (about 90 KB)', () {
      final BytesBuilder blob = BytesBuilder()
        ..add(<int>[0xFE, 0x43, 0x52, 0x44, 1, 0, 1, 0]);
      for (int i = 0; i < depth; i += 1) {
        blob
          ..addByte(0x05)
          ..add(<int>[1, 0, 0, 0, 0, 0, 0, 0]);
      }
      blob.addByte(0x00);
      expect(
        () => decodeDataBlob(blob.toBytes()),
        throwsA(_limit(CraftLimit.maxDepth)),
      );
    });

    test('a deeply nested expression and value in the evaluator', () {
      final TemplateRegistry registry = TemplateRegistry();
      expect(
        () => registry.evaluate(_nestedList(depth), library: _main),
        throwsA(
          isA<EvaluationException>().having(
            (EvaluationException e) => e.kind,
            'kind',
            EvaluationErrorKind.depthExceeded,
          ),
        ),
      );
      expect(
        () => registry.evaluate(
          const ArgsReference(<Object>['a']),
          library: _main,
          args: <String, Object>{'a': _nestedList(depth)},
        ),
        throwsA(
          isA<EvaluationException>().having(
            (EvaluationException e) => e.kind,
            'kind',
            EvaluationErrorKind.depthExceeded,
          ),
        ),
      );
    });

    test('a library built with deep nesting is not registered', () {
      final TemplateRegistry registry = TemplateRegistry();
      final RemoteWidgetLibrary library = RemoteWidgetLibrary(
        const <Import>[],
        <WidgetDeclaration>[
          WidgetDeclaration(
            'A',
            null,
            ConstructorCall('Text', <String, Object?>{
              'text': _nestedList(depth),
            }),
          ),
        ],
      );
      expect(
        () => registry.setTemplateLibrary(_main, library),
        throwsA(_limit(CraftLimit.maxDepth)),
      );
    });

    test('a chain of 900 templates and deep host data', () {
      final StringBuffer source = StringBuffer('import core;\n');
      for (int i = 0; i < 900; i += 1) {
        source.writeln('widget W$i = W${i + 1}(c: args.c);');
      }
      source.writeln('widget W900 = Text(text: args.c);');
      final TemplateRegistry registry = _registry(source.toString());
      final CraftRuntime runtime = CraftRuntime(
        registry,
        library: _main,
        widget: 'W0',
        args: <String, Object?>{'c': 1},
      );
      expect(
        runtime.expand().errors.single.node.kind,
        ExpansionErrorKind.depthExceeded,
      );
      runtime
        ..args = <String, Object?>{'c': _nestedList(depth)}
        ..data = _nestedList(depth);
      expect(runtime.expand().toJson()['root'], <String, Object?>{
        r'$': 'error',
        'kind': 'depthExceeded',
      });
    });

    test('state that a setter nests deeper at each firing', () {
      final CraftRuntime runtime = CraftRuntime(
        _registry(
          'import core; widget S { v: 1 } = '
          'Button(onPressed: set state.v = [state.v]);',
        ),
        library: _main,
        widget: 'S',
      );
      FireResult? failed;
      for (int i = 0; i < 200 && failed == null; i += 1) {
        final WidgetNode root = runtime.expand().root as WidgetNode;
        final FireResult result = runtime.fire(root.arguments['onPressed']!);
        if (result.errors.isNotEmpty) failed = result;
      }
      expect(failed!.errors.single.kind, FireErrorKind.depthExceeded);
    });

    test('a string that doubles at each firing', () {
      final CraftRuntime runtime = CraftRuntime(
        _registry(
          'import core; widget S { s: "ab" } = Button('
          'onPressed: set state.s = concat(a: state.s, b: state.s));',
        ),
        library: _main,
        widget: 'S',
      );
      Expansion expansion = runtime.expand();
      for (int i = 0; i < 40 && expansion.errors.isEmpty; i += 1) {
        runtime.fire((expansion.root as WidgetNode).arguments['onPressed']!);
        expansion = runtime.expand();
      }
      expect(
        expansion.errors.single.node.kind,
        ExpansionErrorKind.stringTooLong,
      );
    });

    test('let bindings that would multiply a source exponentially', () {
      final StringBuffer source = StringBuffer('widget A = let a0 = [1, 1]');
      for (int i = 1; i < 40; i += 1) {
        source.write(', a$i = [a${i - 1}, a${i - 1}]');
      }
      source.write(' in Text(text: a39);');
      expect(
        () => parseLibraryFile(source.toString()),
        throwsA(_limit(CraftLimit.maxNodes)),
      );
    });

    test('nested loops over host data', () {
      final CraftRuntime runtime = CraftRuntime(
        _registry(
          'import core; widget L = Text(text: [...for a in data.l: '
          '[...for b in data.l: [...for c in data.l: Text(text: c)]]]);',
        ),
        library: _main,
        widget: 'L',
        data: <String, Object?>{'l': List<int>.generate(200, (int i) => i)},
      );
      expect(
        runtime.expand().errors.single.node.kind,
        ExpansionErrorKind.stepsExceeded,
      );
    });
  });

  group('CraftLimits', () {
    test('limits must be positive and maxDepth at most the ceiling', () {
      expect(() => CraftLimits(maxSteps: 0), throwsArgumentError);
      expect(
        () => CraftLimits(maxDepth: CraftLimits.maxDepthCeiling + 1),
        throwsArgumentError,
      );
      expect(
        CraftLimits(maxDepth: CraftLimits.maxDepthCeiling).maxDepth,
        CraftLimits.maxDepthCeiling,
      );
    });

    test('utf8Length counts as utf8.encode does', () {
      expect(utf8Length('a\u00E9\u20AC\u{1F600}'), 1 + 2 + 3 + 4);
      expect(utf8Length('\uD800a'), 3 + 1);
    });
  });

  test('a rejected library leaves the registry unchanged', () {
    final TemplateRegistry registry = _registry(
      'import core; widget A = Text(text: "a");',
      limits: CraftLimits(maxNodes: 2),
    );
    expect(
      () => registry.setTemplateLibrary(
        _main,
        parseLibraryFile('import core; widget A = Text(text: [1]);'),
      ),
      throwsA(_limit(CraftLimit.maxNodes)),
    );
    expect(registry.generation(_main), 1);
    expect(
      CraftRuntime(registry, library: _main, widget: 'A').expand().toJson(),
      <String, Object?>{
        'root': <String, Object?>{
          r'$': 'widget',
          'name': 'core::Text',
          'args': <String, Object?>{'text': 'a'},
        },
        'states': <Object?>[],
        'errors': <Object?>[],
      },
    );
  });

  test('a builder output that runs out of steps does not keep the failure in '
      'the arguments it was reading', () {
    // The output takes 9 steps plus one per item of i.l; with 3 items it
    // runs out while it evaluates args.x, which an output without items
    // then reads again.
    final TemplateRegistry registry = _registry(
      'import core;\n'
      'widget root = W(x: [1, 2, 3]);\n'
      'widget W = List(item: (i) => '
      'Text(a: [...for k in i.l: k], b: args.x));',
      limits: CraftLimits(maxSteps: 10),
    );
    final CraftRuntime runtime = CraftRuntime(
      registry,
      library: _main,
      widget: 'root',
    );
    final BuilderNode builder =
        (runtime.expand().root as WidgetNode).arguments['item']! as BuilderNode;
    final Expansion stopped = runtime.expandBuilder(
      builder,
      0,
      <String, Object?>{
        'l': <int>[1, 2, 3],
      },
    );
    expect(stopped.errors.single.node.kind, ExpansionErrorKind.stepsExceeded);
    final Expansion output = runtime.expandBuilder(
      builder,
      1,
      <String, Object?>{'l': <int>[]},
    );
    expect(output.errors, isEmpty);
    expect((output.root as WidgetNode).arguments['b'], <Object>[1, 2, 3]);
  });
}
