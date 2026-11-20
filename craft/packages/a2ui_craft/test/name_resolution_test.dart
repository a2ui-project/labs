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

// Unit tests for what the shared conformance cases cannot state: candidates,
// messages, caching and the Dart API around names.

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:test/test.dart';

class _Primitives extends PrimitiveLibrary {
  _Primitives(this.widgetMeta);

  @override
  final Map<String, Map<String, Object?>> widgetMeta;

  @override
  Iterable<String> get widgetNames => widgetMeta.keys;
}

LibraryName _lib(String dotted) => LibraryName(dotted.split('.'));

void main() {
  test('splitQualifiedName', () {
    expect(splitQualifiedName('Text'), (null, 'Text'));
    expect(splitQualifiedName('core::Text'), (coreLibrary, 'Text'));
    expect(splitQualifiedName('acme.ui::Card'), (_lib('acme.ui'), 'Card'));
  });

  test('export shows in toString and defaults to false', () {
    final RemoteWidgetLibrary library = parseLibraryFile('''
      export widget A = B();
      widget C = D();
    ''');
    expect(library.widgets.map((WidgetDeclaration w) => w.exported), <bool>[
      true,
      false,
    ]);
    expect(library.widgets.first.toString(), 'export widget A = B({});');
    expect(library.widgets.last.toString(), 'widget C = D({});');
  });

  test('qualified names report RFW positions when the qualifier is bad', () {
    expect(
      () => parseLibraryFile('widget root = a.b(x: 1);'),
      throwsA(
        isA<ParserException>().having(
          (ParserException e) => e.toString(),
          'message',
          'Expected symbol "(" but found . at line 1 column 17.',
        ),
      ),
    );
  });

  group('NameResolver', () {
    late Map<LibraryName, WidgetLibrary> libs;
    late NameResolver resolver;

    setUp(() {
      libs = <LibraryName, WidgetLibrary>{
        _lib('core'): _Primitives(<String, Map<String, Object?>>{
          'Text': <String, Object?>{},
          'Button': <String, Object?>{},
        }),
        _lib('acme'): _Primitives(<String, Map<String, Object?>>{
          'Badge': <String, Object?>{'v': 1},
        }),
        _lib('globex'): _Primitives(<String, Map<String, Object?>>{
          'Badge': <String, Object?>{'v': 2},
        }),
        _lib('cards'): parseLibraryFile('''
          import core;
          export widget Card = Text(text: "card");
          widget Secret = Text(text: "secret");
        '''),
        _lib('main'): parseLibraryFile('''
          import core;
          import acme;
          import globex;
          import cards;
          import missing.lib;
          widget Button = Button(child: Text(text: "x"));
          widget root = Button();
        '''),
      };
      resolver = NameResolver(libs);
    });

    ResolvedName resolved(String name, {String? excluding}) =>
        resolver.resolve(_lib('main'), name, excluding: excluding)
            as ResolvedName;
    UnresolvedName unresolved(String name) =>
        resolver.resolve(_lib('main'), name) as UnresolvedName;

    test('a resolved name carries its declaration and full name', () {
      final ResolvedName own = resolved('Button');
      expect(
        own.declaration,
        same((libs[_lib('main')]! as RemoteWidgetLibrary).widgets.first),
      );
      expect(own.fullName, FullyQualifiedWidgetName(_lib('main'), 'Button'));
      final ResolvedName inner = resolved('Button', excluding: 'Button');
      expect(inner.isPrimitive, isTrue);
      expect(inner.fullName, FullyQualifiedWidgetName(coreLibrary, 'Button'));
    });

    test('notQualified lists the candidates in import order, with a fix', () {
      final UnresolvedName badge = unresolved('Badge');
      expect(badge.reason, UnresolvedReason.notQualified);
      expect(badge.candidates, <LibraryName>[_lib('acme'), _lib('globex')]);
      expect(badge.message, contains('acme::Badge'));
      final UnresolvedName card = unresolved('Card');
      expect(card.candidates, <LibraryName>[_lib('cards')]);
      expect(card.message, contains('cards::Card'));
    });

    test('candidates name each import once and never the library itself', () {
      libs[_lib('self')] = parseLibraryFile('''
        import acme;
        import acme;
        import self;
        widget Badge = acme::Badge();
      ''');
      final UnresolvedName r =
          resolver.resolve(_lib('self'), 'Badge', excluding: 'Badge')
              as UnresolvedName;
      expect(r.reason, UnresolvedReason.notQualified);
      expect(r.candidates, <LibraryName>[_lib('acme')]);
    });

    test('messages suggest the fix', () {
      expect(
        unresolved('cards::Secret').message,
        contains('export widget Secret'),
      );
      final UnresolvedName notImported =
          resolver.resolve(_lib('cards'), 'acme::Badge') as UnresolvedName;
      expect(notImported.reason, UnresolvedReason.notImported);
      expect(notImported.message, contains('import acme;'));
      final UnresolvedName privateComponent =
          resolver.resolveCatalogComponent(_lib('cards'), 'Secret')
              as UnresolvedName;
      expect(privateComponent.message, contains('export widget Secret'));
    });

    test('a not-found message names imports that are not registered', () {
      final UnresolvedName r = unresolved('Nope');
      expect(r.reason, UnresolvedReason.notFound);
      expect(r.message, contains('missing.lib'));
    });

    test('visibleNames can ignore own declarations', () {
      final Map<String, NameResolution> names = resolver.visibleNames(
        _lib('main'),
        ownDeclarations: false,
      );
      expect((names['Button']! as ResolvedName).library, coreLibrary);
      expect(names['main::Button'], isA<UnresolvedName>());
      expect((names['acme::Badge']! as ResolvedName).library, _lib('acme'));
    });

    test('invalidate picks up library changes', () {
      expect(resolved('cards::Card').library, _lib('cards'));
      libs.remove(_lib('cards'));
      expect(
        resolved('cards::Card').library,
        _lib('cards'),
        reason: 'cached until invalidated',
      );
      resolver.invalidate();
      expect(unresolved('cards::Card').reason, UnresolvedReason.notFound);
    });
  });
}
