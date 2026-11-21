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

// Unit tests for what craft/conformance/craft/craft_media_context.yaml cannot
// express: the exact sets of names, equality, references with no parts (which
// only the library model and the binary format hold), and the runtime's media
// context as a host API.

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:test/test.dart';

const LibraryName _main = LibraryName(<String>['main']);

const MediaContext _compact = MediaContext(
  width: WidthClass.compact,
  height: HeightClass.medium,
  orientation: SurfaceOrientation.portrait,
);

class _Core extends PrimitiveLibrary {
  @override
  Iterable<String> get widgetNames => const <String>['Box'];

  @override
  Map<String, Map<String, Object?>> get widgetMeta =>
      const <String, Map<String, Object?>>{'Box': <String, Object?>{}};
}

/// A runtime whose root is `root = Box(value: <value>)`, built in the model.
CraftRuntime _boxOf(Object value, {MediaContext? media}) => CraftRuntime(
  TemplateRegistry()
    ..setPrimitiveLibrary(coreLibrary, _Core())
    ..setTemplateLibrary(
      _main,
      RemoteWidgetLibrary(
        const <Import>[Import(coreLibrary)],
        <WidgetDeclaration>[
          WidgetDeclaration(
            'root',
            null,
            ConstructorCall('Box', <String, Object?>{'value': value}),
          ),
        ],
      ),
    ),
  library: _main,
  widget: 'root',
  media: media,
);

Object? _boxValue(CraftRuntime runtime) =>
    canonicalValue((runtime.expand().root as WidgetNode).arguments['value']!);

void main() {
  test('the names of classes, orientations and platforms', () {
    List<String> names(List<Enum> values) => <String>[
      for (final Enum v in values) v.name,
    ];
    expect(names(WidthClass.values), <String>[
      'compact',
      'medium',
      'expanded',
      'large',
      'extraLarge',
    ]);
    expect(names(HeightClass.values), <String>[
      'compact',
      'medium',
      'expanded',
    ]);
    expect(names(SurfaceOrientation.values), <String>['portrait', 'landscape']);
    expect(names(HostPlatform.values), <String>[
      'android',
      'fuchsia',
      'ios',
      'linux',
      'macos',
      'web',
      'windows',
    ]);
  });

  test('media contexts are equal when their media maps are', () {
    final MediaContext fromSize = MediaContext.fromSize(400, 800);
    expect(fromSize, _compact);
    expect(fromSize.hashCode, _compact.hashCode);
    expect(
      MediaContext.fromSize(400, 800, platform: HostPlatform.ios),
      isNot(_compact),
    );
    expect(
      MediaContext.fromSize(400, 800, reducedMotion: true),
      isNot(_compact),
    );
    expect(MediaContext.fromSize(400, 400), isNot(_compact));
  });

  test('the media map is a new map each time', () {
    _compact.toMap()['width'] = 'large';
    expect(_compact.toMap()['width'], 'compact');
  });

  group('a media reference with no parts', () {
    test('reads the whole media map', () {
      expect(
        _boxOf(
          const MediaReference(<Object>[]),
          media: _compact,
        ).expand().errors,
        isEmpty,
      );
      expect(
        _boxValue(_boxOf(const MediaReference(<Object>[]), media: _compact)),
        <String, Object?>{
          'width': 'compact',
          'height': 'medium',
          'orientation': 'portrait',
          'reducedMotion': false,
        },
      );
      expect(
        Evaluator(
          NameResolver(<LibraryName, WidgetLibrary>{}),
          FunctionRegistry(standard: standardFunctions),
        ).evaluate(
          const MediaReference(<Object>[]),
          library: _main,
          media: _compact,
        ),
        _compact.toMap(),
      );
    });

    test('is absent without a media context', () {
      expect(
        _boxValue(_boxOf(const MediaReference(<Object>[]))),
        <String, Object?>{r'$': 'missing'},
      );
    });
  });

  group('the runtime media context', () {
    test('is null unless the host gives one', () {
      expect(_boxOf(const MediaReference(<Object>['width'])).media, isNull);
      expect(
        _boxOf(const MediaReference(<Object>['width']), media: _compact).media,
        _compact,
      );
    });

    test('notifies only when it changes', () {
      final CraftRuntime runtime = _boxOf(
        const MediaReference(<Object>['width']),
      );
      int notified = 0;
      runtime.addListener(() => notified += 1);
      runtime.media = null;
      expect(notified, 0);
      runtime.media = _compact;
      expect(notified, 1);
      runtime.media = MediaContext.fromSize(599, 600);
      expect(notified, 1, reason: 'an equal media context');
      expect(_boxValue(runtime), 'compact');
      runtime.media = MediaContext.fromSize(600, 600);
      expect(notified, 2);
      expect(_boxValue(runtime), 'medium');
    });

    test('can be set without notifying, to notify later', () {
      final CraftRuntime runtime = _boxOf(
        const MediaReference(<Object>['width']),
      );
      int notified = 0;
      runtime.addListener(() => notified += 1);
      expect(runtime.setMedia(_compact, notify: false), isTrue);
      expect(notified, 0);
      expect(runtime.media, _compact);
      expect(_boxValue(runtime), 'compact');
      expect(runtime.setMedia(MediaContext.fromSize(1, 600)), isFalse);
      expect(notified, 0, reason: 'an equal media context');
      expect(runtime.setMedia(null), isTrue);
      expect(notified, 1);
    });

    test('earlier expansions keep what they read', () {
      final CraftRuntime runtime = _boxOf(
        const MediaReference(<Object>['width']),
        media: _compact,
      );
      final Expansion before = runtime.expand();
      runtime.media = MediaContext.fromSize(1000, 600);
      expect(
        canonicalValue((before.root as WidgetNode).arguments['value']!),
        'compact',
      );
      expect(_boxValue(runtime), 'expanded');
    });
  });
}
