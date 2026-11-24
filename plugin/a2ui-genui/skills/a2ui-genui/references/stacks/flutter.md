# Flutter stack

Sources: `https://a2ui.org/guides/defining-a-catalog.md` and
`https://a2ui.org/guides/client-integration.md` (Flutter tab),
`https://a2ui.org/guides/agent-integration.md` (Dart samples, no Flutter
tab). The installed READMEs of `a2ui_flutter`, `a2ui_agent` and
`dartantic_ai`. The example app inside the installed `a2ui_flutter` package,
`example/` (see Session). If your fetch tool cannot quote the code of a
guide, read the installed READMEs: they hold the API of the installed
versions.

## Detect

The app root is the folder whose `pubspec.yaml` depends on the Flutter SDK.
If the folder where the user asked is such a folder, it is the app root: do
not search. Else, in a pub workspace, the app root is a member package (its
`pubspec.yaml` has `resolution: workspace`), not the workspace root. Find it
from the repository root:

```bash
git ls-files -- '*pubspec.yaml' | xargs grep -lE '^[[:space:]]+sdk:[[:space:]]*flutter[[:space:]]*$'
```

If it prints more than one file, ask the user which app to convert. Then run
this check from the app root:

```bash
grep -Eq '^[[:space:]]+sdk:[[:space:]]*flutter[[:space:]]*$' pubspec.yaml && flutter --version
```

The check passes when it prints a Flutter version. In a pub workspace, the
lock file is `pubspec.lock` of the workspace root. It lists a new direct
dependency of the app as `transitive`: read its version, not its kind. The
lock file can be ignored by git. It is still on disk after the install.

## Install

Packages: `a2ui_flutter`, `a2ui_core`, `a2ui_agent`, `json_schema_builder`
and `dartantic_ai`.

Read `pubspec.yaml` and the lock file first. Add all the missing packages
with one `flutter pub add` in the app root. Give a version that the user
named as `a2ui_flutter:0.2.0`. Write each version of the lock file in
`sdk_versions` of the blueprint.

Tested with: `a2ui_flutter` 0.2.0, `a2ui_core` 0.6.0, `a2ui_agent` 0.2.0,
`json_schema_builder` 0.1.7 and `dartantic_ai` 3.4.2. These are not required
versions.

Add `url_launcher` only if the app does not have it and a surface must open
links. In a pub workspace, `flutter pub add` resolves the whole workspace
again, and the workspace lock file can change for other members too.

Install traps:

- Use pub.dev versions only. Do not copy the upstream example's `path`
  dependencies.
- `json_schema_builder` must be a direct dependency, because a catalog
  imports its `Schema`. Without it, `flutter analyze` reports
  `depend_on_referenced_packages`.
- `a2ui_flutter` depends on `video_player`, so `flutter pub add` can change
  the generated plugin registrants of the platform folders. Keep that change.

Build check, for steps 2 and 3: `flutter analyze --no-fatal-infos` in the app
root exits 0. An info is a style lint of the app's `analysis_options.yaml`.
It does not fail the check. A warning or an error does.

## Catalog

Read the section "Defining Custom Components" in the installed
`a2ui_flutter` README. Put each app component in one `CatalogImplementation`
with its own `id` and `protocolVersion: A2uiProtocolVersion.v1_0`. Each
component is a `ComponentImplementation` that wraps an existing app widget.
The guide writes `Catalog<ComponentImplementation, FunctionImplementation>`:
`CatalogImplementation` is the `a2ui_flutter` name for that type.

Declare a property that can show data as
`Schema.fromMap({r'$ref': r'common_types.json#/$defs/DynamicString'})` (or
`DynamicNumber`, `DynamicBoolean`, `DynamicStringList`). Do not use the
`CommonSchemasV1.dynamicString` of the guide's Flutter tab (see Traps). A
`description` next to the `$ref` shows in the prompt.

## Session

The installed `a2ui_flutter` package holds an example app that is both agent
and renderer, at the installed version. Find the package folder:

```bash
grep -A1 '"name": "a2ui_flutter"' .dart_tool/package_config.json
```

In a pub workspace, `.dart_tool/` is in the workspace root. Read
`example/lib/chat_session.dart`, `example/lib/llm_client.dart`,
`example/lib/chat_app.dart`, `example/test/fake_client.dart` and
`example/test/recorded_turn_test.dart` in that folder.

Write the session in one new folder of the app, where the app keeps the
files of a feature. Start from `chat_session.dart` and `llm_client.dart` of
the example, and keep their license header. Keep the code of the example
that already does an item below. Put the generation core in one class that
extends `ChangeNotifier`. If a flow is `inline`, put the conversation
entries and `send` in a subclass. The core does these things:

1. Catalogs. Give the basic catalog and the app's catalogs to one
   `A2uiGenerator` (one `CatalogConfig` for each, each id in
   `A2uiRendererCapabilities.forCatalogIds`). Give the same objects to the
   one `MessageProcessor`. `basicCatalog(openUrl: ...)` takes the app's
   `launchUrl` if the app opens links.
2. System prompt, in the order of `references/model-client.md`: the
   instructions, the turn rules, then `promptSnippet`. The instructions are a
   parameter. Write a text with a `$/path` as a raw string (`r'''...'''`).
3. Format and stream. Use A2UI Express, the default format of the agent
   SDK, not the Direct JSON of the example. Read each reply with
   `openContinuingStream`, not `openStream` (see Traps).
4. Targets. Give each target a turn history and a busy state: the
   conversation, and each standing target, such as `sidebar` or `home`. A
   generation starts from one user turn: the typed text, or the request
   that the host builds from the brief of the placement file.
5. Surface ids. For a standing target, give each generation a new id,
   `<target>-<n>`, and fill it into the `surface("<surface id>")` line of
   the brief. `ExpressFormatFactory` has no option for a surface id, and its
   default id is `default_surface`.
6. The swap. Collect the surfaces of a standing answer from
   `processor.model.onSurfaceCreated`, and show none while it streams. When
   the answer is complete and its context key is current, show its surface.
   Then remove the old surface with `processor.model.deleteSurface(id)`, not
   with a message. Remove the surfaces of a cut-off answer, or of an answer
   for an old key, the same way. The old surface stays. A stream that ends
   inside a block does not throw: `close()` returns an `ErrorPart` with an
   `A2uiParseError`. For a standing answer, that is a cut-off answer: show
   the error state, and send no error turn.
7. Wrong id. If the answer created a surface under another id, remove it,
   never show it, and send one error turn that repeats the instruction.
8. Host data. `surface.dataModel.set(path, value)` writes a host value, with
   a JSON pointer path such as `/context/count`. Keep the values of each
   target, and write them all again into the new surface at the swap.
9. History. A new generation clears the turn history of its target. Start
   a generation through a call that takes the target, the context key and
   a function from surface id to request. The call does nothing when the
   key is the same.
10. Actions and errors go back as the next user turn of the target that
    shows the surface, with the messages of the SDK. After 2 error turns in
    a row, send no more. A standing target then shows its error state.
    Retry starts a new generation.
11. Queue. One queue runs one turn at a time for all targets.
12. The write handler. The core takes it as a parameter, and calls it with
    the `A2uiRendererAction` before the turn of that action, in each
    placement. Do not subscribe to `processor.model.onAction` in a widget.
13. A reply timeout. Put `.timeout(replyTimeout)` on each `moveNext()` of the
    chunk iterator, with a default of 5 minutes. Cancel the iterator after a
    failure.

Write three more files in the same folder: the app catalog and
instructions, the read tools, and the write handler. The last two are
functions that take the app's data. Construct the session once, in the
state of a widget above every container, such as the app root.

## Model client

`llm_client.dart` of the example holds the `LlmClient` interface and the
`GeminiClient` class, on `dartantic_ai`. Keep both. The model name is the
`modelName` setting of its constructor, with the default `gemini-3.6-flash`
in 0.2.0. If the user names a model, pass it where the app builds the
client. Use the same name in the ping. The example of 0.2.0 has the retry
rule of `references/model-client.md`. Keep it.

The `dartantic_ai` README has no tools section. The tool API is
`Tool(name:, description:, inputSchema:, onCall:)` in `lib/src/tool.dart` of
`dartantic_interface`, which `dartantic_ai` exports.

- Tools: add a `List<dartantic.Tool> tools = const []` parameter to the
  `GeminiClient` constructor, and pass it as `tools:` to
  `Agent.forProvider`. `sendStream` runs the tool calls, so the session sees
  only text. Write each read tool as `Tool<Map<String, dynamic>>`, whose
  `onCall` calls the app's data function.
- Timeout: `dartantic_ai` 3.4.2 has no request timeout. Map each result of
  `sendStream` to its `output`, keep the outputs that are not empty, then
  put `.timeout(const Duration(seconds: 90))` on that stream. Do not put it
  on `sendStream` itself (see Traps).

## Mount

Read `https://a2ui.org/guides/client-integration.md` (Flutter tab, steps 3
and 5) and the "Render a surface" section of the `a2ui_flutter` README.

For each placement:

- Show a surface as `A2uiSurface(key: ObjectKey(surface), surface: surface)`
  in a `ListenableBuilder` on the session.
- Mount it under the app's `MaterialApp`, inside a `Material`, such as a
  `Scaffold` body. The basic components are Material widgets and use the
  host `Theme`, so you need no theme mapping.
- The container: wrap the surface and its state widgets in
  `Semantics(container: true, explicitChildNodes: true, label: '<name>')`.
  A test finds it with `find.bySemanticsLabel('<name>')`, and a widget in
  it with `find.descendant(of: container, matching: ...)`.
- The busy signal: a `LinearProgressIndicator` in the container while its
  target has a turn in the queue. A test finds it in the container.
- The context key: a string that the widget of the container builds, such
  as `list:some`. The widget gives it with each start.
- After a write, the app's screen that shows that data must show the new
  state. Reload it from its repository or view model when it shows again.

`inline`: use `example/lib/chat_app.dart` as the model. If the app does not
have `flutter_markdown_plus` or `url_launcher`, leave out those parts.

- The container is the conversation list. Show each surface entry as an
  `A2uiSurface`, and each text, sent and error entry as a `Text` that shows
  only its text.
- Add a `TextField` with a hint and a send `IconButton` with a tooltip, so
  that a test finds them. Disable the send control while the session is
  busy or there is no key.

`sidebar`: the container is the app's side panel or drawer of the screen,
such as `Scaffold.endDrawer`. On a narrow layout, it is a persistent sheet
that opens from the screen with `showBottomSheet` of the `Scaffold`, not
with `showModalBottomSheet`: a modal sheet blocks taps on the list behind
it, so the panel cannot follow the selection.

- The widget in the container starts the generation, and listens to the
  selection. On a change, it writes the data, then starts with the new key.

`home`: the container is a region at the top of the first screen's body.
While the target has no surface, it shows the app's normal content. The
widget writes the date to `/today` before it starts the generation. The
context key is the date. Read the clock again, and start with that key,
when a route that was pushed from the screen pops, and in
`AppLifecycleListener(onResume:)`.

For `sidebar` and `home`: start the generation in `initState` with
`WidgetsBinding.instance.addPostFrameCallback`. The start notifies the
listeners, and a notify during a build fails. When the target has an
error, show its text and one `TextButton` that calls retry. The old content
stays. The widget also listens to the key, so that the first generation
starts when the user saves a key.

## Key

Add the key entry to the app's settings screen or drawer, not to a
conversation. Keep the key in the app's secure key store, such as
`flutter_secure_storage`, so that the user enters it one time. If the app
has no secure store, add `flutter_secure_storage`. Read the key once when
the app starts, into the state of the widget that owns the session. A test
gives the key to that widget, and reads no store. Never put the key in a
`--dart-define`: its value is compiled into the build.

This stack keeps no key file. Check, with the key in `GEMINI_API_KEY`, after
each recording and before your last message:

```bash
test -n "$GEMINI_API_KEY" && ! git grep --untracked --no-exclude-standard -l -F -f <(printenv GEMINI_API_KEY) -- .
```

It searches each file under the app root, also the files that git ignores,
such as `build/` and `.dart_tool/`. It exits 0 when no file holds the key,
and prints only the names of the files that do.

## Flow test

- Runner: `flutter_test` widget tests, with no device. Run all with
  `flutter test`, and 3 in a row with
  `for i in 1 2 3; do flutter test || exit 1; done`.
- One flow, and the core test:
  `flutter test --timeout 60s test/<flow>_test.dart`. Put it in the flow's
  `test_command`. Without the timeout, a hung test holds it for 10 minutes.
- Replay: copy `FakeClient` and `errorsOf` from
  `example/test/fake_client.dart` into `test/fake_client.dart`, and change
  the imports. `FakeClient` replays reply N for call N of `generate`, and
  keeps the system prompt and the turns of each call. The test gives it to
  the session, and pumps the screen of the flow's container.
- To hold a reply, give `FakeClient` a map from a call index to a `Future`
  that the test completes. While it is held, the busy signal shows.
- Fixture: `{"request": "...", "replies": [["chunk", ...], ...]}`, with
  Express replies. `request` is the typed text, or the exact host-built
  turn. An error turn uses a reply. A replay does not run a read tool.
- `example/test/recorded_turn_test.dart` shows cases 1 and 2 of the core
  test. To print the system prompt, build the session with `FakeClient([])`
  in a scratch test, print `systemPrompt`, then delete the test.
- A `context` trigger: pump the screen, then do the trigger's steps.
- The clock: the app's widget takes `DateTime Function() now` as a normal
  constructor parameter. The test passes a fixed clock.
- The wait: after a step that starts a turn, `pump()` once, then assert
  that the container shows no busy signal. While a reply is held, pump a
  fixed duration, not `pumpAndSettle`: it runs fake time on to the reply
  timeout.
- A resume: step the lifecycle through `inactive`, `hidden`, `paused`,
  `hidden`, `inactive`, `resumed`. A jump from `resumed` to `paused` fails
  an assertion.
- "No second request": assert the length of `client.requests`. Assert the
  first turn of a standing request against the app's own request builder.
- Read tools: call a tool with `tool.call(args)` inside `tester.runAsync`,
  on the app's data built as the app's own tests build it. Call it before
  you pump a surface that loads network images.
- A write: assert its effect in the data, and make the data again in
  `setUp`. If a second write looks like one write, wrap the handler and
  assert one action name for each press.
- If the app's tests mock network images, run each test in that mock.
- A basic `Button` is a `FilledButton` for the variant `primary`, a
  `TextButton` for `borderless`, and an `OutlinedButton` for the others.
- `testWidgets` fails on each exception that Flutter reports, the console
  check of `references/flows.md`. Do not call `tester.takeException()`.
- Tap a widget on a surface after `tester.ensureVisible(finder)`: a surface
  taller than the 800×600 test window hides it.
- A basic `DateTimeInput` opens a date picker. Tap
  `find.widgetWithText(InputDecorator, '<label>')`, tap
  `find.byIcon(Icons.edit_outlined)`, `enterText` the date as `06/01/2027`,
  and tap `find.text('OK')`. A date-only input writes `2027-06-01`.

Record: write `test/record_<flow>_test.dart`, and keep it after the
recording. It pumps the same screen as the flow test, with the app's real
`GeminiClient` and read tools behind a recorder, and writes the fixture.
Pump only that screen, so that no other target makes a request.

1. The recorder is a second class in `test/fake_client.dart`. It implements
   `LlmClient`, wraps another `LlmClient`, and passes its chunks through. It
   keeps the first turn's text as `request` and the chunks of each call as
   one reply. Its `toJson()` throws if a call failed, so a failed turn
   writes no fixture.
2. Read the key with `Platform.environment['A2UI_RECORD_KEY']`, and give the
   test `skip: key.isEmpty` and a timeout of 10 minutes.
3. Set `HttpOverrides.global = null`: `flutter_test` answers every HTTP
   request with 400. Set
   `WidgetController.hitTestWarningShouldBeFatal = true`, so that a missed
   tap fails the attempt.
4. The model runs in real time and the widget test in fake time. After each
   step that starts a turn, wait while the session is busy. Stop at the
   first error of any target, so that no error turn uses a request:

   ```dart
   do {
     await tester.runAsync(() => Future<void>.delayed(const Duration(milliseconds: 100)));
     await tester.pump(const Duration(milliseconds: 100));
   } while (session.busy && session.errors.isEmpty);
   ```

   After each wait: if `session.errors` is not empty, print the reply text
   of each call. Then `expect(session.errors, isEmpty)`.

5. Before the test ends, `await tester.pump(const Duration(minutes: 1))`,
   so that the idle timers of the HTTP client end. Then write
   `const JsonEncoder.withIndent('  ').convert(recorder)` to
   `test/fixtures/<flow>.json`.

Run
`A2UI_RECORD_KEY="$GEMINI_API_KEY" flutter test test/record_<flow>_test.dart`.

If the app's tests mock network images, do not use that mock in the record
test: it can also answer the model's requests. If the app loads images with
a cache package, such as `cached_network_image`, hold the `path_provider`
call open, so that the images do not load. It needs `dart:async` and
`package:flutter/services.dart`:

```dart
tester.binding.defaultBinaryMessenger.setMockMethodCallHandler(
  const MethodChannel('plugins.flutter.io/path_provider'),
  (_) => Completer<Object?>().future,
);
```

Then run the key check of Key.

## Traps

Each trap was seen with `a2ui_flutter` 0.2.0, `a2ui_agent` 0.2.0 and
`dartantic_ai` 3.4.2. A newer version can remove it. Before you work around
a trap, find it with its check in the installed version. If the check does
not find it, leave the work-around out.

| Trap                                                                                                                                                                                                                                                 | Check that finds it                                                                                                                                                                                                |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A block without a `surface(...)` line goes to the surface `default_surface`. A second such block in the session is rejected: `INTEGRITY_ERROR on "": Surface default_surface already exists.` The old surface stays and the error goes to the model. | Test case 1 of `references/placements/inline.md`: the second answer gives that error turn.                                                                                                                         |
| `surface("its-id")` with a new `root` on a surface that exists is also rejected as `INTEGRITY_ERROR`. `surface("its-id", update=true)` updates it.                                                                                                   | Case 2 of the core test: its second reply uses `update=true`.                                                                                                                                                      |
| An update block that references a variable of an earlier block without assigning it again is rejected: `UNKNOWN_ERROR on "": Variable 'title' is not assigned in surface 's'.`                                                                       | A recording whose update block writes `root = Card(Column([title, done]))` without `title = ...` gives that error entry.                                                                                           |
| An update block with `root = <variable>` is rejected: `UNKNOWN_ERROR on "": 'root' must be assigned a component.` The old root stays.                                                                                                                | That error entry after an action.                                                                                                                                                                                  |
| An Express data path segment holds only letters, digits and `_`. `$/sel/a-b` gives `PARSE_ERROR ... token recognition error at: '-b'`.                                                                                                               | An error entry with `token recognition error`.                                                                                                                                                                     |
| The prompt marks a property of the action type `(action)`, such as `onOpen? (action)`, and rule 14 of the prompt makes each such parameter required. The model adds a placeholder event.                                                             | Read the signature of each app component in `systemPrompt`. See `references/catalog.md`.                                                                                                                           |
| A `TextField` with the variant `number` writes its text, such as `"12.5"`, to the data model and the action context.                                                                                                                                 | Convert the value in the write handler.                                                                                                                                                                            |
| `.timeout` on `Agent.sendStream` does not bound the time to the first text: results with no text start it again.                                                                                                                                     | A request that sends only results with no text for minutes. Filter first, then put the timeout (Model client).                                                                                                     |
| In a widget test, a data function that reads an asset with `rootBundle` never ends in fake time. An example is the write handler after a tap. The test hangs until its timeout.                                                                      | Read the data once in `runAsync` before the pump. In the test data, give the tools and the handler a repository that keeps that result.                                                                            |
| A property declared with `CommonSchemasV1.dynamicString` shows as `(static)` in the Express prompt, so the model is told not to bind it. The Express schema helper sees only a `$ref` to `Dynamic...`.                                               | Case 1 of the core test: assert the signature in the system prompt.                                                                                                                                                |
| A rejected block has `surfaceId: ""` in its error turn, and Express creates no part of it. With `openStream` instead of `openContinuingStream`, text in the same chunk as the block is lost, and the rest of the reply is not read.                  | Case 4 of the core test: text before and after shows, and no surface.                                                                                                                                              |
| A wrong argument type does not always give `VALIDATION_FAILED` with a `path`. A positional argument can give `UNKNOWN_ERROR` with no path, and a number for a `DynamicStringList` passes.                                                            | In a hand-written recording, assert the error text that the session shows, from a run, not one you expect.                                                                                                         |
| A recording with too few replies fails with `The turn failed: RangeError`, because each error turn uses a reply.                                                                                                                                     | `session.errors` and the number of calls that the fake client kept.                                                                                                                                                |
| Chunks split words, so `grep` on a recording can miss text.                                                                                                                                                                                          | `jq -j '.replies[0][]' test/fixtures/<flow>.json` prints reply 0 joined.                                                                                                                                           |
| `dartantic_ai` 3.4.2 has no request timeout. A held request leaves the session busy.                                                                                                                                                                 | The timeout of Model client ends it after 90 s with no text. The session ends a reply that sends no chunk for `replyTimeout` as `The request failed: TimeoutException after 0:05:00.000000: Future not completed`. |
| `Stream.timeout` read with a `StreamIterator` in a widget test never delivers the done event, so the turn never ends.                                                                                                                                | Put the timeout on each `moveNext()` (Session, item 13).                                                                                                                                                           |
