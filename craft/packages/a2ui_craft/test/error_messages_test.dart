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

// Messages for authors and the positions in error reports, which the
// conformance suites do not pin (see the craft_runtime blueprint,
// requirement 12, and craft_text_format, requirement 6).

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:test/test.dart';

const LibraryName _main = LibraryName(<String>['main']);

class _Core extends PrimitiveLibrary {
  @override
  Iterable<String> get widgetNames => const <String>['Column', 'Text', 'Box'];

  @override
  Map<String, Map<String, Object?>> get widgetMeta =>
      <String, Map<String, Object?>>{
        for (final String name in widgetNames) name: const <String, Object?>{},
      };
}

Expansion _expand(RemoteWidgetLibrary library, {String widget = 'W'}) =>
    CraftRuntime(
      TemplateRegistry()
        ..setPrimitiveLibrary(coreLibrary, _Core())
        ..setTemplateLibrary(_main, library),
      library: _main,
      widget: widget,
    ).expand();

ExpansionError _error(String source) => _expand(
  parseLibraryFile(source, sourceIdentifier: 'main.craft'),
).errors.single;

String _parseError(String source) {
  try {
    parseLibraryFile(source);
  } on ParserException catch (e) {
    return e.message;
  }
  fail('$source parsed');
}

void main() {
  group('parser messages', () {
    test('let after the bindings says how bindings are written', () {
      expect(
        _parseError('widget W = let a = 1 in let b = 2 in Text(text: b);'),
        startsWith('let can only start the body of a widget declaration'),
      );
    });

    test('let inside a value says where let is allowed', () {
      expect(
        _parseError('widget W = Column(children: [let b = 2 in Text()]);'),
        contains('let a = 1, b = 2 in'),
      );
    });

    test('let followed by "(" is still a call', () {
      expect(
        () => parseLibraryFile('widget W = Column(children: [let(x: 1)]);'),
        returnsNormally,
      );
    });

    test('a whole builder argument names the argument and the fix', () {
      expect(
        _parseError('widget W = Box(b: (it) => Text(text: it));'),
        'The builder argument it must be read with parts, as in it.name; '
        'unlike a loop variable it cannot be used whole',
      );
    });
  });

  group('runtime messages', () {
    test('a self-call says that a declaration cannot call itself', () {
      final ExpansionError error = _error(
        'import core; widget W = Column(children: [W()]);',
      );
      expect(error.kind, ExpansionErrorKind.unknownFunction);
      expect(error.node.message, startsWith('W calls itself'));
      expect(error.node.message, contains('not recursive'));
    });

    test('a qualified self-call says so too', () {
      expect(
        _error(
          'import core; widget W = Column(children: [main::W()]);',
        ).node.message,
        startsWith('main::W calls itself'),
      );
    });

    test('a widget passed to a function names the function and argument', () {
      expect(
        _error(
          'import core; widget W = Column(children: '
          '[orElse(value: Text(), otherwise: 1)]);',
        ).node.message,
        'The argument value of orElse is the widget core::Text, but must be '
        'a value.',
      );
    });

    test('a builder in an event argument names the event', () {
      expect(
        _error(
          'import core; widget W = Box(on: event "tap" {b: (x) => Text()});',
        ).node.message,
        'An argument of event "tap" is a widget builder, but must be a value.',
      );
    });

    test('a handler as a switch input says so', () {
      expect(
        _error(
          'import core; widget W = Box(a: switch event "e" {} {default: 1});',
        ).node.message,
        'The input of switch is a handler, but must be a value.',
      );
    });

    test('a widget as the handler of call allows handlers', () {
      expect(
        _error('import core; widget W = Box(a: call Text() {});').node.message,
        'The handler of call is the widget core::Text, but must be a value '
        'or a handler.',
      );
    });
  });

  group('error reports', () {
    test('give the template and position in their text', () {
      final ExpansionError error = _error(
        'import core;\r\nwidget W = Column(children: [\r\n'
        '  Text(text: nope()),\r\n]);\r\n',
      );
      expect(widgetNameString(error.template!), 'main::W');
      expect(error.source!.start.line, 3);
      expect(error.source!.start.column, 14);
      expect(error.location, 'main::W, line 3 column 14 of main.craft');
      expect(
        error.toString(),
        'ExpansionError(unknownFunction at children.0 in main::W, line 3 '
        'column 14 of main.craft): nope is neither a widget nor a function '
        'callable from main.',
      );
    });

    test('give only the template without positions', () {
      const String source = 'import core; widget W = Text(text: nope());';
      for (final RemoteWidgetLibrary library in <RemoteWidgetLibrary>[
        parseLibraryFile(source),
        decodeLibraryBlob(
          encodeLibraryBlob(parseLibraryFile(source, sourceIdentifier: 'x')),
        ),
      ]) {
        final ExpansionError error = _expand(library).errors.single;
        expect(error.source, isNull);
        expect(error.location, 'main::W');
        expect(error.toString(), contains('at the root in main::W):'));
      }
    });

    test('take no position from another library', () {
      const LibraryName other = LibraryName(<String>['other']);
      final ExpansionError error = CraftRuntime(
        TemplateRegistry()
          ..setPrimitiveLibrary(coreLibrary, _Core())
          ..setTemplateLibrary(
            other,
            parseLibraryFile(
              'import core;\nexport widget Card = Box(\n  child: Text(text: args.v),\n);',
              sourceIdentifier: 'other.craft',
            ),
          )
          ..setTemplateLibrary(
            _main,
            parseLibraryFile(
              'import core; import other; widget W = Box(child: other::Card(v: nope()));',
            ),
          ),
        library: _main,
        widget: 'W',
      ).expand().errors.single;
      expect(error.node.message, startsWith('nope'));
      expect(widgetNameString(error.template!), 'main::W');
      expect(
        error.source,
        isNull,
        reason: 'the failing call is in main, which has no positions',
      );
    });

    test('give neither for a root that names no widget', () {
      final ExpansionError error = _expand(
        parseLibraryFile('import core; widget W = Text();'),
        widget: 'Nothing',
      ).errors.single;
      expect(error.template, isNull);
      expect(error.location, isNull);
      expect(
        error.toString(),
        startsWith('ExpansionError(notAWidget at the root):'),
      );
    });
  });

  group('source locations', () {
    test('count CR LF, CR and LF as one line break each', () {
      final RemoteWidgetLibrary library = parseLibraryFile(
        'import core;\r\n// c\rwidget A = Text();\n\r\n  widget B = Text();',
        sourceIdentifier: 's',
      );
      final SourceLocation a = library.widgets[0].source!.start;
      final SourceLocation b = library.widgets[1].source!.start;
      expect(<int?>[a.line, a.column], <int>[3, 1]);
      expect(<int?>[b.line, b.column], <int>[5, 3]);
    });

    test('count columns in code points', () {
      final RemoteWidgetLibrary library = parseLibraryFile(
        'widget root = A(\r\n  e: "\u{1F600}\u{1F600}", b: B(),\n'
        '  f: "\u{1F600}"\n  , c: C());',
        sourceIdentifier: 's',
      );
      final Map<String, Object?> arguments =
          (library.widgets.single.root as ConstructorCall).arguments;
      final SourceLocation b = (arguments['b']! as BlobNode).source!.start;
      final SourceLocation c = (arguments['c']! as BlobNode).source!.start;
      expect(<int?>[b.line, b.column], <int>[2, 15]);
      expect(<int?>[c.line, c.column], <int>[4, 8]);
    });

    test('take no part in equality', () {
      expect(
        const SourceLocation('s', 3, line: 1, column: 4),
        const SourceLocation('s', 3),
      );
    });
  });
}
