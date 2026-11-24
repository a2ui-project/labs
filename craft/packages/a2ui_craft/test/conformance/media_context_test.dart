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

// Runs the conformance suite of the craft_media_context feature
// (craft/conformance/craft/craft_media_context.yaml). The YAML header documents
// the case format.

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:a2ui_craft/model.dart';
import 'package:test/test.dart';

import 'conformance_harness.dart';
import 'media_input.dart';
import 'runtime_engine.dart';

void main() {
  runConformanceSuite(
    'craft/craft_media_context.yaml',
    <String, ConformanceAction>{
      'media_map': ConformanceAction(
        const <String>{'media', 'size', 'expect'},
        (ConformanceTestCase c) {
          final Map<String, Object?> expected =
              c['expect']! as Map<String, Object?>;
          expect(expected.keys, <String>['map'], reason: 'expect has one key');
          expect(mediaInput(c['media'], c['size'])!.toMap(), expected['map']);
        },
      ),
      'media_sizes': ConformanceAction(const <String>{
        'sizes',
        'platform',
        'reducedMotion',
        'expect',
      }, _sizes),
      'evaluate_media': ConformanceAction(const <String>{
        'expression',
        'core',
        'media',
        'size',
        'expect',
      }, _value),
      'expand_template': expandTemplateAction,
    },
  );
}

void _sizes(ConformanceTestCase c) {
  final List<Object?> sizes = c['sizes']! as List<Object?>;
  final Map<String, Object?> expected = c['expect']! as Map<String, Object?>;
  final List<Object?>? maps = expected['maps'] as List<Object?>?;
  if (maps == null) {
    expect(expected, <String, Object?>{'error': 'hostError'});
  } else {
    expect(maps, hasLength(sizes.length), reason: 'one map per size');
  }
  for (final (int i, Object? size) in sizes.indexed) {
    final [Object? width, Object? height] = size! as List<Object?>;
    MediaContext media() => mediaInput(null, <String, Object?>{
      'width': width,
      'height': height,
      'platform': c['platform'],
      'reducedMotion': c['reducedMotion'],
    })!;
    if (maps == null) {
      expect(media, throwsArgumentError, reason: 'size $size');
    } else {
      expect(media().toMap(), maps[i], reason: 'size $size');
    }
  }
}

const LibraryName _test = LibraryName(<String>['test']);

class _Core extends PrimitiveLibrary {
  @override
  Iterable<String> get widgetNames => const <String>['Text'];

  @override
  Map<String, Map<String, Object?>> get widgetMeta =>
      const <String, Map<String, Object?>>{'Text': <String, Object?>{}};
}

void _value(ConformanceTestCase c) {
  final String expression = c['expression']! as String;
  final Map<String, Object?> expected = c['expect']! as Map<String, Object?>;
  final RemoteWidgetLibrary library = parseLibraryFile(
    <String>[
      if (c['core'] != false) 'import core;',
      'widget test = Result(value: $expression);',
    ].join('\n'),
  );
  final TemplateRegistry registry = TemplateRegistry()
    ..setPrimitiveLibrary(coreLibrary, _Core())
    ..setTemplateLibrary(_test, library);
  Object? evaluate() => canonicalValue(
    registry.evaluate(
      (library.widgets.single.root as ConstructorCall).arguments['value'],
      library: _test,
      declaration: 'test',
      media: mediaInput(c['media'], c['size']),
    ),
  );
  if (expected['error'] case final String kind) {
    expect(
      evaluate,
      throwsA(
        isA<EvaluationException>().having(
          (EvaluationException e) => e.kind.name,
          'kind',
          kind,
        ),
      ),
    );
    return;
  }
  expect(expected.keys, <String>['value'], reason: 'expect has one key');
  expect(evaluate(), expected['value']);
}
