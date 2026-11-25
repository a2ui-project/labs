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

// Widget tests of how CraftView sets its runtime's media context.

import 'package:a2ui_craft/a2ui_craft.dart';
import 'package:a2ui_craft_flutter/a2ui_craft_flutter.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_test/flutter_test.dart';

const LibraryName _main = LibraryName(<String>['main']);

final PrimitiveWidgetLibrary _widgets =
    PrimitiveWidgetLibrary(<String, PrimitiveWidget>{
      'Text': PrimitiveWidget(
        (BuildContext context, PrimitiveArguments args) =>
            Text(switch (args['text']) {
              Missing() => '',
              final Object value => '$value',
            }, textDirection: TextDirection.ltr),
      ),
    });

/// Shows every media property, and counts expansions.
const String _showMedia = '''
  import core;
  import t;
  widget root = Text(text: concat(a: t::count(), b: concat(a: media.width, b: concat(a: " ", b: concat(a: media.height, b: concat(a: " ", b: concat(a: media.orientation, b: concat(a: " ", b: concat(a: media.platform, b: concat(a: " ", b: media.reducedMotion))))))))));
''';

class _Harness {
  _Harness([String source = _showMedia]) {
    registry
      ..setPrimitiveLibrary(coreLibrary, _widgets)
      ..setHostFunctions(
        const LibraryName(<String>['t']),
        <String, LocalFunction>{
          'count': LocalFunction(
            arguments: const <String, FunctionArgType>{},
            implementation: (DynamicMap arguments) {
              expansions += 1;
              return '';
            },
          ),
        },
      )
      ..setTemplateLibrary(_main, parseLibraryFile(source));
    runtime = CraftRuntime(registry, library: _main, widget: 'root');
  }

  final TemplateRegistry registry = TemplateRegistry();
  late final CraftRuntime runtime;
  final List<Object> errors = <Object>[];
  int expansions = 0;

  Widget view({MediaSource media = MediaSource.layout}) => CraftView(
    runtime: runtime,
    libraries: <LibraryName, PrimitiveWidgetLibrary>{coreLibrary: _widgets},
    onError: errors.add,
    media: media,
  );
}

/// [child] in a box of [width] by [height], under a MediaQuery of [window].
Widget _sized(
  Widget child, {
  double? width,
  double? height,
  Size window = const Size(1300, 1000),
  bool disableAnimations = false,
}) => MediaQuery(
  data: MediaQueryData(size: window, disableAnimations: disableAnimations),
  child: Align(
    alignment: Alignment.topLeft,
    child: SizedBox(width: width, height: height, child: child),
  ),
);

/// Makes the test surface large enough for every size the tests give.
void _largeSurface(WidgetTester tester) {
  tester.view
    ..physicalSize = const Size(2000, 2000)
    ..devicePixelRatio = 1;
  addTearDown(tester.view.reset);
}

void main() {
  testWidgets('layout: the size the view is given, from the first frame', (
    WidgetTester tester,
  ) async {
    _largeSurface(tester);
    final _Harness h = _Harness();
    await tester.pumpWidget(_sized(h.view(), width: 599, height: 480));
    expect(find.text('compact medium landscape android false'), findsOneWidget);
    expect(
      h.expansions,
      2,
      reason: 'before its first layout the view expands for the window',
    );
    expect(
      h.runtime.media,
      MediaContext.fromSize(599, 480, platform: HostPlatform.android),
    );

    final _Harness same = _Harness();
    await tester.pumpWidget(
      _sized(
        same.view(),
        width: 599,
        height: 480,
        window: const Size(560, 500),
      ),
    );
    expect(find.text('compact medium landscape android false'), findsOneWidget);
    expect(same.expansions, 1, reason: 'the window has the same classes');
  });

  testWidgets('layout: a resize across a class renders in the same frame', (
    WidgetTester tester,
  ) async {
    _largeSurface(tester);
    final _Harness h = _Harness();
    int notified = 0;
    h.runtime.addListener(() => notified += 1);
    await tester.pumpWidget(_sized(h.view(), width: 500, height: 900));
    expect(
      find.text('compact expanded portrait android false'),
      findsOneWidget,
    );
    expect(notified, 1);
    h.expansions = 0;

    await tester.pumpWidget(_sized(h.view(), width: 590, height: 900));
    expect(h.expansions, 0, reason: 'the same classes');
    expect(notified, 1);

    await tester.pumpWidget(_sized(h.view(), width: 1200, height: 900));
    expect(find.text('large expanded landscape android false'), findsOneWidget);
    expect(h.expansions, 1);
    expect(notified, 2);
    await tester.pump();
    expect(h.expansions, 1, reason: 'nothing left for the next frame');
  });

  testWidgets('host listeners hear of a media change after the frame', (
    WidgetTester tester,
  ) async {
    _largeSurface(tester);
    final _Harness h = _Harness();
    final List<SchedulerPhase> phases = <SchedulerPhase>[];
    Widget host(double width) => _sized(
      _Listening(
        runtime: h.runtime,
        onChange: () => phases.add(SchedulerBinding.instance.schedulerPhase),
        child: h.view(),
      ),
      width: width,
      height: 600,
    );
    for (final MediaSource media in <MediaSource>[
      MediaSource.layout,
      MediaSource.window,
    ]) {
      phases.clear();
      h.expansions = 0;
      h.runtime.setMedia(null, notify: false);
      await tester.pumpWidget(
        _sized(
          _Listening(
            runtime: h.runtime,
            onChange: () =>
                phases.add(SchedulerBinding.instance.schedulerPhase),
            child: h.view(media: media),
          ),
          width: 500,
          height: 600,
          window: const Size(500, 600),
        ),
      );
      expect(tester.takeException(), isNull, reason: media.name);
      expect(phases, <SchedulerPhase>[SchedulerPhase.postFrameCallbacks]);
      expect(h.expansions, 1, reason: media.name);
      await tester.pump();
      expect(h.expansions, 1, reason: 'the host rebuild expands nothing');
      await tester.pumpWidget(const SizedBox());
    }
    phases.clear();
    h.expansions = 0;
    await tester.pumpWidget(host(500));
    await tester.pumpWidget(host(590));
    await tester.pumpWidget(host(900));
    expect(tester.takeException(), isNull);
    expect(
      find.text('expanded medium landscape android false'),
      findsOneWidget,
    );
    expect(phases, <SchedulerPhase>[
      SchedulerPhase.postFrameCallbacks,
    ], reason: 'only 900 changes the classes the window mode set');
    await tester.pump();
    expect(h.expansions, 2);
  });

  testWidgets('layout: an unbounded axis takes the MediaQuery size', (
    WidgetTester tester,
  ) async {
    _largeSurface(tester);
    final _Harness h = _Harness();
    await tester.pumpWidget(
      _sized(UnconstrainedBox(child: h.view()), window: const Size(700, 950)),
    );
    expect(find.text('medium expanded portrait android false'), findsOneWidget);
    await tester.pumpWidget(
      MediaQuery(
        data: const MediaQueryData(size: Size(700, 950)),
        child: Align(
          alignment: Alignment.topLeft,
          child: SizedBox(
            width: 300,
            child: Column(children: <Widget>[h.view()]),
          ),
        ),
      ),
    );
    expect(
      find.text('compact expanded portrait android false'),
      findsOneWidget,
    );
  });

  testWidgets('window: the MediaQuery size, whatever the layout', (
    WidgetTester tester,
  ) async {
    _largeSurface(tester);
    final _Harness h = _Harness();
    await tester.pumpWidget(
      _sized(h.view(media: MediaSource.window), width: 300, height: 300),
    );
    expect(find.text('large expanded landscape android false'), findsOneWidget);
    await tester.pumpWidget(
      _sized(
        h.view(media: MediaSource.window),
        width: 300,
        height: 300,
        window: const Size(400, 900),
      ),
    );
    expect(
      find.text('compact expanded portrait android false'),
      findsOneWidget,
    );
  });

  testWidgets('every media source answers intrinsic size queries', (
    WidgetTester tester,
  ) async {
    _largeSurface(tester);
    for (final MediaSource media in MediaSource.values) {
      for (final bool width in <bool>[true, false]) {
        final _Harness h = _Harness();
        if (media == MediaSource.host) {
          h.runtime.media = MediaContext.fromSize(
            1300,
            1000,
            platform: HostPlatform.android,
          );
        }
        final Widget view = h.view(media: media);
        await tester.pumpWidget(
          _sized(
            width ? IntrinsicWidth(child: view) : IntrinsicHeight(child: view),
          ),
        );
        final String reason = '${media.name} ${width ? 'width' : 'height'}';
        expect(tester.takeException(), isNull, reason: reason);
        final Size text = tester.getSize(find.byType(Text));
        final Size box = tester.getSize(
          find.byType(width ? IntrinsicWidth : IntrinsicHeight),
        );
        expect(text.width, greaterThan(100), reason: reason);
        if (width) {
          expect(box.width, text.width, reason: '$reason: sized to the text');
        } else {
          expect(box.height, text.height, reason: '$reason: not 0 px');
        }

        final RenderBox render = tester.renderObject(find.byType(CraftView));
        final double line = text.height;
        expect(
          render.getMinIntrinsicWidth(double.infinity),
          greaterThan(0),
          reason: '$reason: min intrinsic width',
        );
        expect(
          render.getMaxIntrinsicWidth(double.infinity),
          greaterThan(100),
          reason: '$reason: max intrinsic width',
        );
        expect(
          render.getMinIntrinsicHeight(2000),
          inInclusiveRange(1, line),
          reason: '$reason: min intrinsic height',
        );
        expect(
          render.getMaxIntrinsicHeight(2000),
          inInclusiveRange(1, line),
          reason: '$reason: max intrinsic height',
        );
        final Size dry = render.getDryLayout(BoxConstraints.loose(box));
        expect(dry.height, greaterThan(0), reason: '$reason: dry layout');
        expect(dry.width, greaterThan(0), reason: '$reason: dry layout');
        await tester.pumpWidget(const SizedBox());
      }
    }
  });

  testWidgets('layout: a new view keeps the media context of the runtime', (
    WidgetTester tester,
  ) async {
    _largeSurface(tester);
    final _Harness h = _Harness();
    await tester.pumpWidget(_sized(h.view(), width: 500, height: 900));
    await tester.pumpWidget(const SizedBox());
    h.expansions = 0;
    await tester.pumpWidget(_sized(h.view(), width: 500, height: 900));
    expect(
      find.text('compact expanded portrait android false'),
      findsOneWidget,
    );
    expect(h.expansions, 1, reason: 'no expansion for the window first');
  });

  testWidgets('host: the view leaves the media context alone', (
    WidgetTester tester,
  ) async {
    _largeSurface(tester);
    final _Harness h = _Harness();
    const MediaContext tv = MediaContext(
      width: WidthClass.extraLarge,
      height: HeightClass.expanded,
      orientation: SurfaceOrientation.landscape,
    );
    h.runtime.media = tv;
    await tester.pumpWidget(
      _sized(h.view(media: MediaSource.host), width: 300, height: 300),
    );
    expect(find.text('extraLarge expanded landscape  false'), findsOneWidget);
    expect(h.runtime.media, tv);
    h.runtime.media = null;
    await tester.pump();
    expect(find.text('    '), findsOneWidget);
  });

  testWidgets('platform and reduced motion', (WidgetTester tester) async {
    _largeSurface(tester);
    final _Harness h = _Harness();
    debugDefaultTargetPlatformOverride = TargetPlatform.iOS;
    await tester.pumpWidget(
      _sized(h.view(), width: 400, height: 800, disableAnimations: true),
    );
    expect(find.text('compact medium portrait ios true'), findsOneWidget);
    debugDefaultTargetPlatformOverride = TargetPlatform.fuchsia;
    await tester.pumpWidget(_sized(h.view(), width: 400, height: 800));
    expect(find.text('compact medium portrait fuchsia false'), findsOneWidget);
    debugDefaultTargetPlatformOverride = null;
  });

  testWidgets('a template that needs the media context reports no error', (
    WidgetTester tester,
  ) async {
    _largeSurface(tester);
    final _Harness h = _Harness('''
      import core;
      widget root = switch media.width { "compact": Text(text: "phone"), "expanded": Text(text: "tablet") };
    ''');
    await tester.pumpWidget(_sized(h.view(), width: 400, height: 800));
    await tester.pump();
    expect(find.text('phone'), findsOneWidget);
    expect(h.errors, isEmpty);
    await tester.pumpWidget(_sized(h.view(), width: 900, height: 800));
    await tester.pump();
    expect(find.text('tablet'), findsOneWidget);
    expect(h.errors, isEmpty);
    await tester.pumpWidget(_sized(h.view(), width: 700, height: 800));
    await tester.pump();
    expect(
      (h.errors.single as ExpansionError).kind,
      ExpansionErrorKind.notAWidget,
    );
  });
}

/// A host that rebuilds whenever [runtime] notifies.
class _Listening extends StatefulWidget {
  const _Listening({
    required this.runtime,
    required this.onChange,
    required this.child,
  });

  final CraftRuntime runtime;
  final VoidCallback onChange;
  final Widget child;

  @override
  State<_Listening> createState() => _ListeningState();
}

class _ListeningState extends State<_Listening> {
  @override
  void initState() {
    super.initState();
    widget.runtime.addListener(_changed);
  }

  @override
  void dispose() {
    widget.runtime.removeListener(_changed);
    super.dispose();
  }

  void _changed() {
    widget.onChange();
    setState(() {});
  }

  @override
  Widget build(BuildContext context) => widget.child;
}
