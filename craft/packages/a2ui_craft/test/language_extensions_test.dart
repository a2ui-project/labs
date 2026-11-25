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

// The craft_language_extensions constructs in terms of the library model: what
// nodes the parser builds for them.

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:a2ui_craft/model.dart';
import 'package:test/test.dart';

Object? _rootArg(String source, String arg) =>
    (parseLibraryFile(source).widgets.single.root as ConstructorCall)
        .arguments[arg];

Matcher _throwsParserException() => throwsA(isA<ParserException>());

void main() {
  group('absent', () {
    test('parses, bare or as a call, to the call absent()', () {
      for (final String form in <String>['absent', 'absent()']) {
        final Object? value = _rootArg('widget r = Text(text: $form);', 'text');
        expect(value, isA<ConstructorCall>());
        final ConstructorCall call = value! as ConstructorCall;
        expect(call.name, 'absent');
        expect(call.arguments, isEmpty);
      }
    });

    test('is a reserved word', () {
      expect(
        () => parseLibraryFile(
          'widget r = Column(children: [...for absent in args.x: Text()]);',
        ),
        _throwsParserException(),
      );
    });

    test('round-trips through the binary format as a plain call', () {
      final RemoteWidgetLibrary library = parseLibraryFile(
        'widget r = Text(text: absent);',
      );
      expect(
        canonicalLibrary(decodeLibraryBlob(encodeLibraryBlob(library))),
        canonicalLibrary(library),
      );
    });
  });

  group('call', () {
    test('parses to a call named call with handler and arguments', () {
      final ConstructorCall call =
          _rootArg(
                'widget r = Button(onPressed: call args.onPick { value: 1 });',
                'onPressed',
              )!
              as ConstructorCall;
      expect(call.name, 'call');
      expect(call.arguments.keys, <String>['handler', 'arguments']);
      expect(call.arguments['handler'], isA<ArgsReference>());
      expect(call.arguments['arguments'], <String, Object?>{'value': 1});
    });
  });

  group('...if', () {
    test('parses to a loop over a switch', () {
      final Object? children = _rootArg(
        'widget r = Column(children: [...if args.on: Text(text: "x")]);',
        'children',
      );
      final Loop loop = (children! as List<Object?>).single! as Loop;
      final Switch condition = loop.input as Switch;
      expect(condition.input, isA<ArgsReference>());
      expect(condition.outputs, <Object?, Object>{
        true: <Object?>[true],
        null: <Object?>[],
      });
      expect(loop.output, isA<ConstructorCall>());
    });

    test('shifts outer loop references like the loop it is', () {
      final Object? children = _rootArg('''
          widget r = Column(children: [
            ...for item in args.items: Column(children: [
              ...if item.on: Text(text: item.label),
            ]),
          ]);''', 'children');
      final Loop outer = (children! as List<Object?>).single! as Loop;
      final Loop inner =
          ((outer.output as ConstructorCall).arguments['children']!
                      as List<Object?>)
                  .single!
              as Loop;
      // `item` in the condition is one loop out; in the element, two.
      expect(((inner.input as Switch).input as LoopReference).loop, 0);
      expect(
        ((inner.output as ConstructorCall).arguments['text']! as LoopReference)
            .loop,
        1,
      );
    });
  });

  group('let', () {
    test('replaces each use with the bound value', () {
      final WidgetDeclaration declaration = parseLibraryFile('''
          widget r = let
            label = args.label,
            line = Text(text: label)
          in Column(children: [line, line]);''').widgets.single;
      final List<Object?> children =
          (declaration.root as ConstructorCall).arguments['children']!
              as List<Object?>;
      expect(children, hasLength(2));
      for (final Object? child in children) {
        expect(
          (child! as ConstructorCall).arguments['text'],
          isA<ArgsReference>(),
        );
      }
    });

    test('may be the declaration root, and loop variables shadow it', () {
      final WidgetDeclaration declaration = parseLibraryFile(
        '''
          widget r = let item = Text(text: "bound") in
            Column(children: [item, ...for item in args.items: Text(text: item)]);''',
      ).widgets.single;
      final List<Object?> children =
          (declaration.root as ConstructorCall).arguments['children']!
              as List<Object?>;
      expect(children.first, isA<ConstructorCall>());
      expect(
        ((children.last! as Loop).output as ConstructorCall).arguments['text'],
        isA<LoopReference>(),
      );
      expect(
        parseLibraryFile(
          'widget r = let b = Text(text: "a") in b;',
        ).widgets.single.root,
        isA<ConstructorCall>(),
      );
    });

    test('a use followed by ".", "(" or "::" gets its own message', () {
      // The surrounding syntax would reject these at the same position too;
      // the message says why.
      for (final String use in <String>['a.x', 'a(x: 1)', 'a::Card()']) {
        expect(
          () =>
              parseLibraryFile('widget r = let a = Box() in Box(child: $use);'),
          throwsA(
            isA<ParserException>().having(
              (ParserException e) => e.message,
              'message',
              startsWith('A let binding is used whole'),
            ),
          ),
        );
      }
    });

    test('is scoped to its declaration and rejects misuse', () {
      expect(
        () => parseLibraryFile('''
              widget a = let x = Text(text: "a") in x;
              widget b = Column(children: [x]);'''),
        _throwsParserException(),
      );
      expect(
        () => parseLibraryFile('widget r = let x = 1, x = 2 in Text();'),
        _throwsParserException(),
      );
      expect(
        () => parseLibraryFile('widget r = let x = {a: 1} in Text(text: x.a);'),
        _throwsParserException(),
      );
      expect(
        () => parseLibraryFile('widget r = let args = 1 in Text();'),
        _throwsParserException(),
      );
    });
  });
}
