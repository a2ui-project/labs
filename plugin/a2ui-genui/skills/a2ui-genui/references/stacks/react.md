# Stack: React (TypeScript)

Sources: `https://a2ui.org/guides/defining-a-catalog.md`,
`https://a2ui.org/guides/client-integration.md` and
`https://a2ui.org/guides/agent-integration.md` (React and TypeScript tabs). The
installed READMEs of `@a2ui/agent` ("Streaming", "An app that is both agent and
renderer"), `@a2ui/react` and `@google/genai`.

## Detect

Rule: the app root is the folder whose `package.json` has `react` in
`dependencies` or `devDependencies`. In a repository with workspaces, it is
a workspace package. To find it, run this in the repository root:

```bash
git ls-files -- '*package.json' | xargs grep -l '"react":'
```

If it prints more than one file, ask the user which app to convert. Then run
this at the app root:

```bash
node -e "const p=require('./package.json');const d={...p.dependencies,...p.devDependencies};console.log('react:',d.react??'none','| react-dom:',d['react-dom']??'none','| vite:',d.vite??'none','| @playwright/test:',d['@playwright/test']??'none');process.exit(d.react?0:1)"
```

Exit code 0 means the rule matches. Find the package manager from the lock
file in the app root or in the workspace root above it:

| Lock file           | Package manager | Add                  | Add a dev dependency    | Show the installed versions | Run a script with arguments  |
| ------------------- | --------------- | -------------------- | ----------------------- | --------------------------- | ---------------------------- |
| `package-lock.json` | npm             | `npm install <pkgs>` | `npm install -D <pkgs>` | `npm ls <pkg>`              | `npm run <script> -- <args>` |
| `yarn.lock`         | yarn            | `yarn add <pkgs>`    | `yarn add -D <pkgs>`    | `yarn why <pkg>`            | `yarn <script> <args>`       |
| `pnpm-lock.yaml`    | pnpm            | `pnpm add <pkgs>`    | `pnpm add -D <pkgs>`    | `pnpm why <pkg>`            | `pnpm <script> <args>`       |

In a workspace, add to the app's package only: `npm install -w <name>`,
`yarn workspace <name> add`, or `pnpm --filter <name> add`. Use this package
manager for every command of this file. With another lock file, stop and
report it.

Yarn 2 and later can come with the repository and not be on `PATH`: then
`yarn --version` fails, and `.yarnrc.yml` names a `yarnPath`, such as
`.yarn/releases/yarn-4.9.1.cjs`. Use `node <yarnPath>` in place of `yarn` in
every command, also in `test_command`, with the path relative to the app root.

Tell the user what the command printed, the app root and the package
manager. If `vite` is `none`, tell the user that the flow test of this file
expects a Vite build, and that you will adapt the build and preview commands.

## Install

Packages: `@a2ui/agent`, `@a2ui/web_core`, `@a2ui/react`, `zod` (major 3, see
T2) and `@google/genai`. As dev dependency: `@playwright/test`. Do not
install `@a2ui/markdown-it` (T1): `@a2ui/react` brings it.

Read `package.json` and the lock file first. A repository can force one
version on all workspaces (yarn constraints, a root `resolutions`, a pnpm
catalog): do not change it. For the current version, add the package name
with no version, and `zod@3`. Use the commands of the Detect table. Put the
packages in the block of `package.json` that holds the app's `react`. Write
each installed version, as the lock file has it, in `sdk_versions`.

Tested with: `@a2ui/agent` 0.1.0, `@a2ui/web_core` 0.15.0, `@a2ui/react`
0.15.0, `zod` 3.25.76, `@google/genai` 3.0.0 and `@playwright/test` 1.65.0
(also 1.61.1). These are not required versions.

Then run `npx playwright install chromium-headless-shell` once on each
machine, and in CI before the flow test. It downloads the browser that the
installed `@playwright/test` needs, and installs no package.

Use registry versions only. Do not use `--force`, `--legacy-peer-deps` or git
dependencies. `@a2ui/react` needs `react` and `react-dom` 18 or 19. A monorepo
install can need several GB of disk: check the free space first.

Check: the version command shows one version of `@a2ui/web_core`, and this
command in the app root prints a `3.x` version three times:

```bash
node -e "const v=f=>require(require.resolve('zod/package.json',{paths:[f]})).version;console.log('app:',v('.'),'| web_core:',v(require.resolve('@a2ui/web_core')),'| agent:',v(require.resolve('@a2ui/agent')))"
```

It shows the zod that the app's catalog and the SDKs resolve. A zod 4 that
another tool of the repository brings does not fail the check. If the SDKs
of the installed versions resolve zod 4, the app's catalog must use zod 4
too: the three versions must have the same major.

Build check, for steps 2 and 3: the app's own typecheck script and its build
script, run with the package manager. Both exit 0. Run the full typecheck that
the app's CI runs: a script can check each file in a stricter mode than plain
`tsc`. If the app has no typecheck script, run `npx tsc --noEmit -p .`. If the
app has more than one build script, run the one that makes the web bundle
that the flow test serves, with its mode. If the build fails because the
output of another workspace is missing (`ENOENT` on its `dist`), build that
workspace once with its own script. Name that command in your last
message: a fresh checkout needs it before `test:a2ui`.

## Catalog

Follow `https://a2ui.org/guides/defining-a-catalog.md`, the React tab. The
installed `node_modules/@a2ui/react/README.md` ("Defining Custom Components")
explains the binder props.

- Wrap each app component with `createComponentImplementation` from
  `@a2ui/react`, and a zod schema that uses the `Dynamic*Schema` types from
  `@a2ui/web_core/v1_0`.
- Put the wrappers in `new Catalog(id, '1.0', [...])` from
  `@a2ui/web_core/v1_0`.
- Export one list, `[basicCatalog, appCatalog]`. The session gives this one
  list to the agent SDK and to the renderer.

## Session

Write the session as one module of a new folder, for example
`src/a2ui/session.ts`. Write it from the installed
`node_modules/@a2ui/agent/README.md`: "Streaming" and "An app that is both
agent and renderer". The types are in `node_modules/@a2ui/agent/src/index.d.ts`
and in `@a2ui/web_core/v1_0`. The session must do these things:

1. One renderer: one `MessageProcessor` from `@a2ui/web_core/v1_0` with the
   catalog list of Catalog. Give the same list to `A2uiGenerator` of
   `@a2ui/agent`.
2. System prompt: the order of "The system prompt" in
   `references/model-client.md`, with `promptSnippet` of the processor.
3. Stream: give each chunk of the reply to the SDK as it arrives.
   `StreamedAnswer` of `@a2ui/agent` reads one answer: it applies each
   message to the renderer, and keeps the text, the surfaces and the
   rejected blocks in the order that the model wrote them (T7). If the
   installed version does not export it, use `openStream` with
   `RendererState.of(renderer)` and `afterRejectedBlock: 'continue'`.
4. Targets: a generation runs for one target, the conversation or a standing
   target. One user turn starts it: the typed text, or the request that the
   host builds from the brief of the placement file. Each standing target has
   its own turn history, and a new generation starts it again.
5. Surface ids: give each generation of a standing target a new id, such as
   `sidebar-1`, then `sidebar-2`, and put it in the brief. Make the request
   processor with `new ExpressFormatFactory({surfaceId})` and that id. In the
   conversation, give each answer a new id, such as `reply-1` (T5).
6. Context key: start a generation of a standing target only when its key
   changes. A queued generation for an old key does not start.
7. Standing slot: when an answer is complete, show its surface. Then remove
   the old surface with `renderer.model.deleteSurface(id)`, not with a
   message. Remove the surface of a cut-off answer, or of an answer for a
   context key that is no longer current. The old surface then stays. An
   answer is cut off when its stream fails, or when `isInBlock` of the
   `StreamedAnswer` is true at the end of the stream. Then show the error
   state, and send no error turn.
8. Another id: if a standing answer creates a surface under another id,
   remove it. Send one error turn that repeats the instruction. Make it with
   `mapErrorToRendererMessage` from an `Error` whose text is
   `Draw into the surface "sidebar-1": start the block with surface("sidebar-1").`
   and the options `{version: '1.0', surfaceId}`.
9. Host data: write each host value with the `set(path, value)` method of
   `surface.dataModel`. The path is a JSON pointer with no `$`, such as
   `/today`. Keep the values of each target, and write them into each new
   surface again.
10. Actions and errors go back as the next user turn of the target that
    shows the surface. Each rejected block and each renderer error is one
    error turn. The turn is JSON: `{"a2ui": {"messages": [...]}}`, with
    `"metadata": {"a2uiRendererDataModel": ...}` when
    `renderer.getRendererDataModel()` returns a value. The messages are the
    `ActionPayload` of the action callback and
    `mapErrorToRendererMessage(error, {version: '1.0'})`.
11. Error cap: send at most 2 error turns in a row for each target. A typed
    turn, an action or a new generation starts the count again. After the
    limit, a standing target shows its error state.
12. One queue: one turn of any target runs at a time. A target is busy from
    the moment a turn of it is queued until that turn ends.
13. Write handler: take the app's handler as an option, and call it as
    "Writes belong to the host" in `references/model-client.md` says. Do not
    subscribe to `renderer.model.onAction` in a component (T12).
14. Reply timeout: as "Timeout and retry" in `references/model-client.md`
    says (T14). A failed request shows as an error entry, or as the error
    state of a standing target.
15. Store: keep the conversation as a list of entries in order: user text,
    model text, surfaces, sent turns and errors. Keep one slot for each
    standing target: its surface, busy and error. Give the session a
    `subscribe` function for `useSyncExternalStore`.

## Model client

Write one class with one method, `generate(systemPrompt, turns)`, that
returns an async iterable of text chunks, with the Gemini SDK for JavaScript,
`@google/genai`. Read `https://a2ui.org/guides/agent-integration.md`
(TypeScript tab) and the installed `node_modules/@google/genai/README.md`:
"Streaming" and "Function Calling" under "Samples". The tool types
(`FunctionDeclaration`, `Part.functionCall`) are in
`node_modules/@google/genai/dist/genai.d.ts`. Map the turns to the `user` and
`model` roles. The model name is one exported constant of the model client,
with the default `gemini-3.6-flash`. If the user names a model, use that one,
also in the ping.

- Send the model's parts back unchanged with the tool results, so that the
  model gets its thought signatures.
- Keep the read tools in one module, with one entry for each tool: its
  `FunctionDeclaration`, and a `run(args)` function that calls the app's data
  function.
- Timeout: `new GoogleGenAI({apiKey, httpOptions: {timeout: 90_000}})`. This
  timeout also covers the read of the streamed body (T19).
- Read the key when a request starts, not when the module loads, so that a
  key that the user types later is used.

## Mount

Follow `https://a2ui.org/guides/client-integration.md`, steps 3 and 4, React
tab. The placement files use three terms:

- Container: the element that holds the surface. Give it a role and an
  accessible name, so that a test finds it with `getByRole(role, {name})`.
- Busy signal: `aria-busy={busy}` on the container, and the app's own
  progress component. In the conversation, the send control is also off.
- Context key: a string that the host makes from the screen and the shape of
  the selection, such as `list:some`. The host gives it with the request.

In each placement:

- Call `injectBasicCatalogStyles()` from `@a2ui/web_core/v1_0` once.
- Map the host theme: set the `--a2ui-color-*` and `--a2ui-*` CSS variables on
  the container to the host's design tokens. The full list is in
  `node_modules/@a2ui/web_core/src/universal/basic_catalog/styles/default.js`.
- Read the session with `useSyncExternalStore(session.subscribe, ...)`, and
  render a surface with `<A2uiSurface surface={surface} />` of `@a2ui/react`.
- T4: load the code that imports the SDKs with `import()`.
- After a write, the app's screen that shows that data must show the new
  state, for example through the app's own data hooks.
- Markdown is optional: see "Markdown in `Text`" in the `@a2ui/react`
  README. Do not import `@a2ui/markdown-it` (T1).

`inline`: the container is the conversation, in the app's own panel, dialog
or drawer component.

- An `<ol aria-label="Conversation">` with one `<li>` for each entry. On each
  `<li>`, `data-kind` with the entry's kind (`user`, `model`, `surface`,
  `sent`, `error`), and on a surface entry `data-surface-id`.
- A textbox with an accessible name, and a send button with a name that is
  `disabled` while the session is busy.

`sidebar`: the container is the app's side panel, such as
`<aside aria-label="<panel name>">`, with the role `complementary`.

- In an effect of the panel, if a key is stored, write the host values with
  the data write of the session. Then start the generation with its key.
- While the slot has no surface, show the app's normal content of the panel.
- Error state: an element with `role="alert"` that shows the error, and one
  retry control that starts a new generation.

`home`: the container is a region at the top of the first screen, such as
`<section aria-label="Today">`, with the role `region`. In an effect, and
again on `visibilitychange`, read the date with `new Date()`, write it to
`/today`, and start the generation with the date as the context key. Show
the normal content and the error state as `sidebar` does.

## Key

Add the key entry to the app's settings screen or drawer, not to a
conversation. Keep the key in `localStorage`. Never put the key in an
environment variable that the bundler writes into the bundle. Find the app's
public prefix: `envPrefix` in the Vite config (default `VITE_`),
`REACT_APP_` for Create React App, `NEXT_PUBLIC_` for Next.js.

Never give the key field the stored key as its value. Keep the field empty,
and say in its placeholder if a key is stored. A failed Playwright test
writes the text of the page, also the value of a password field, to
`test-results/` (T15).

The record run of Flow test reads the key from the environment. Check, with
the key in `GEMINI_API_KEY`, after each recording and before your last
message:

```bash
test -n "$GEMINI_API_KEY" && ! git grep --untracked --no-exclude-standard -l -F -f <(printenv GEMINI_API_KEY) -- . ':!*node_modules/*'
```

It searches each file under the app root except `node_modules`, also ignored
files such as `test-results/`, and prints only the names of the files that
hold the key. If the build or the test runner writes to a folder outside the
app root, add that folder after the `.`.

## Flow test

Runner: Playwright Test in headless Chromium, against the built app served by
`vite preview`. Keep the app's own Playwright config and tests as they are.

1. Config: write `playwright.a2ui.config.ts` at the app root, with a test folder
   of its own (`testDir`, for example `tests/a2ui`), `baseURL`
   `http://127.0.0.1:4179`, and a `webServer` that runs
   `npx vite preview --host 127.0.0.1 --port 4179 --strictPort`, with
   `env: {BROWSER: 'none'}` so that no browser window opens. If the build uses
   `--mode`, give preview the same `--mode`. `vite preview` sends
   `preview.headers`, or `server.headers` if that is not set. If the app needs
   response headers, such as COOP and COEP, that it sets in another way, set
   them in `preview.headers`. If the app's own Playwright config makes the
   data fixed, copy those `use` options (see `references/blueprint.md`).
2. Script: add `test:a2ui` to `package.json` (or `test`, if the app has no
   `test` script): the app's build command exactly as its build script runs it,
   with its mode and flags, then `playwright test -c playwright.a2ui.config.ts`.
3. Run the app's typecheck and its unit test script once. If the typecheck now
   fails on the new specs, add the test folder to the `exclude` of that
   tsconfig: Playwright compiles the specs itself. If the unit test runner
   collects the specs (vitest and jest collect `*.spec.ts` by default), add the
   folder to its exclude.

Fixture format: `{"request": "<the turn>", "responses": [[<event>, ...], ...]}`.
`request` is the typed text, or the exact turn that the host builds, with the
surface id of the first generation, such as `sidebar-1`. `responses[N]` holds
the events of response N of the model endpoint: the JSON of each `data:` line
of its streamed body, in order. A turn with a tool call has two responses: the
tool call, then the answer. An action turn and an error turn each have their
own.

Replay: write one helper module, such as `<test folder>/replay.ts`. Its
`replay(page, responses)` answers the model requests of the page from the
fixture, so the app runs its own client, tools and session. It returns the
list of requests:

1. `page.addInitScript` puts a placeholder, such as `replay-no-key`, where
   the key entry keeps the key, so that the app makes its client.
2. It routes the host `generativelanguage.googleapis.com` with `page.route`,
   and keeps the body of each request (`route.request().postDataJSON()`).
3. It answers request N with `route.fulfill` of response N: status 200,
   `contentType: 'text/event-stream'`, the header
   `access-control-allow-origin: *`, and one `data: <event JSON>` line and an
   empty line for each event. With no response N, it answers status 400.

What a test reads from the requests, with `@google/genai` 3.0.0. Print one
request once if the installed version differs:

- The system prompt: `requests[0].systemInstruction.parts[0].text`.
- The turn that the model received: `parts[0].text` of the last entry of
  `contents` of that request. Assert that the first one equals the
  fixture's `request`. An action turn and an error turn are JSON.
- The result of a read tool: `parts[0].functionResponse` of the last entry
  of `contents` of the request after a tool call response.
- The count: after the flow, `requests.length` is the number of responses
  of the fixture. For "no second request", wait until the busy signal ends,
  then assert `expect(requests).toHaveLength(1)`.

Start the flow by its trigger. For a `prompt` trigger, fill the textbox and
press the send button. For a `context` trigger, do the user's steps with the
app's own locators: `page.goto`, a `check()` on a row, a click that opens
the container. If the request holds the date, set the clock from the test,
before `page.goto`: `await page.clock.setFixedTime(new Date('2026-11-13T12:00:00Z'))`.
With T4, wait for the container before the first step.

Assert in each test that there are no page errors and no console errors
(`page.on('pageerror')`, and `page.on('console')` with the type `error`).
Read the fixture with `test.info().file` as the base path, so the app's
`package.json` needs no `"type": "module"`.

To print the system prompt, or a read tool's result for a hand-written
fixture, write a scratch spec. It replays a text `OK.` (after a tool call
response for a tool result), starts the flow, and prints the request field.
Run it with the one-flow command, then delete it.

Read tools: for a tool call response, the replay runs the app's real read
tool. Its result is the `functionResponse` of the next request. Use it in the
read tool check and the surface check of `references/flows.md`. Read the
app's screen with `locator.allTextContents()`, and format the tool's values
with the app's own formatter when the screen formats them.

A hand-written fixture has one event for each response. A text event is
`{"candidates": [{"content": {"role": "model", "parts": [{"text": "..."}]}}]}`.
A tool call event has `{"functionCall": {"name": "<tool>", "args": {}}}` in
place of the text part. Write the tool call response before the answer for
each read tool of the flow, so that the replay runs the tool.

Locators for basic components. Most basic components render as
`a2ui-basic-<name>`, but a `Card` renders as `a2ui-card`. An app component
renders as `a2ui-react-<name in lower case>`.

- A text field (T8):
  `surface.locator('a2ui-basic-textfield').filter({hasText: '<label>'}).getByRole('textbox')`.
  With the variant `number`, the role is `spinbutton`.
- A text of a basic `Text` only:
  `surface.locator('a2ui-basic-text').getByText('<text>', {exact: true})`.
  An app component with the same text then does not match.
- A ChoicePicker renders one radio for each option, named by its label:
  `surface.getByRole('radio', {name: 'Food'}).check()`.

One flow: the script with the spec file as argument, as the Detect table says,
for example `npm run test:a2ui -- tests/a2ui/<flow>.spec.ts`. It builds the app
and runs only that spec. Put this command in the flow's `test_command` in the
blueprint.

Record, as `references/flows.md` says:

1. Add `record(page)` to the helper module. On each `response` event of the
   page whose URL has the model host and whose request method is `POST`, it
   keeps the promise of `response.text()` for status 200. A response with
   another status is a failed attempt of the client, and has no place in a
   fixture. Its `fixture(request)` awaits the bodies, and returns the
   fixture: for each body, `JSON.parse` of each line that starts with
   `data:`, without that prefix.
2. Write `<test folder>/<flow>.record.spec.ts`, and keep it after the
   recording. At the top level of the file, not in a `describe`: skip it
   unless `process.env.A2UI_RECORD_KEY` is set, so that the script never
   calls the model. Give it `test.setTimeout(600_000)` and
   `test.use({trace: 'off', screenshot: 'off', video: 'off'})`: a trace keeps
   the request headers, and with them the key. In `page.addInitScript`, put
   the key where the key entry keeps it.

   Do the steps of the flow, with the locators of the flow test. `click()`
   scrolls a button into view. Before the step that starts a turn (the click,
   or `page.goto`), make a `page.waitForResponse` promise for the model host.
   Await it after that step. Then wait for the end of the turn:

   - `inline`: wait for
     `page.getByRole('button', {name: 'Send', disabled: false}).or(page.locator('li[data-kind="error"]')).first()`.
     An error entry also ends the wait, so that no error turn uses a request.
   - `sidebar` and `home`: wait until the busy signal ends:
     `await expect(container).toHaveAttribute('aria-busy', 'false', {timeout: 300_000})`.

   After each wait, print the error entries (`li[data-kind="error"]`) or the
   text of `container.getByRole('alert')`, and assert that there is none.
   Only then write `JSON.stringify(await recorder.fixture(request), null, 1)` to
   `<test folder>/fixtures/<flow>.json`. For a `context` trigger, make
   `request` with the app's own request function and the first surface id.

3. Run the one-flow command for the record spec, with the key in the
   environment only, for example
   `A2UI_RECORD_KEY="$GEMINI_API_KEY" npm run test:a2ui -- tests/a2ui/<flow>.record.spec.ts`.
4. Run the key check of Key.

## Traps

Each trap was seen with the version in its second column. A newer version can
remove it. Before you work around a trap, find it with its check in the
installed version. If the check does not find it, leave the work-around out.

| #   | Seen with                        | Trap                                                                                                                                                                                                                                                                                                                                                                              | Check that finds it                                                                                                                       |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| T1  | `@a2ui/markdown-it` 0.2.2        | It wants `@a2ui/web_core ^0.14.0`. `@a2ui/react` brings it, and npm prints `ERESOLVE overriding peer dependency` as an expected warning.                                                                                                                                                                                                                                          | `npm install @a2ui/markdown-it` stops with `ERESOLVE`.                                                                                    |
| T2  | `zod` 4, `@a2ui/web_core` 0.15.0 | An install of `zod` with no version gives zod 4, and the SDKs use zod 3.                                                                                                                                                                                                                                                                                                          | The zod command of Install prints two major versions.                                                                                     |
| T3  | `@a2ui/agent` 0.1.0              | It imports `fs` and `path`. Vite prints `Module "fs" has been externalized` and `"readFileSync" is not exported by "__vite-browser-external"`. The bundle works. Do not add polyfills.                                                                                                                                                                                            | `vite build` exits with 0, and the flow test has no page error.                                                                           |
| T4  | `@a2ui/*` 0.15.0                 | The SDKs add about 1 MB (300 kB gzip). Load the assistant with `import()`.                                                                                                                                                                                                                                                                                                        | `vite build` warns that a chunk is larger than 500 kB, and the chunk is the entry chunk.                                                  |
| T5  | `@a2ui/agent` 0.1.0              | The SDK names a surface `main` when the model writes no `surface(...)`. A second answer that does the same is rejected: `INTEGRITY_ERROR on "main": Surface main already exists.` Give each answer its own id with `new ExpressFormatFactory({surfaceId})`: in a standing slot, the id that the brief names.                                                                      | Test case 1 of `references/placements/inline.md`: two answers that name no surface.                                                       |
| T6  | `@a2ui/agent` 0.1.0              | The Express prompt snippet does not teach `surface("id", sendDataModel=true)` or `surface("id", update=true)`. A reply that writes a new `root` for an existing surface without `update=true` is rejected: `Surface <id> already exists.` The turn rules of `references/model-client.md` teach both.                                                                              | Print the system prompt. Case 2 of the core test. In a live run, an error entry with `already exists`.                                    |
| T7  | `@a2ui/agent` 0.1.0              | `RendererState.of(renderer)` applies messages while the stream reads a chunk, before the text of that chunk is shown. An entry added from `onSurfaceCreated` shows before the text that comes before it. `StreamedAnswer` keeps the order.                                                                                                                                        | Case 4 of the core test, in `inline` its Test case 2, checks the order.                                                                   |
| T8  | `@a2ui/react` 0.15.0             | The basic `TextField` renders a `<label>` that is not tied to its `<input>`. `getByRole('textbox', {name})` and `getByLabel` find nothing.                                                                                                                                                                                                                                        | The locator times out. Use the text field locator of Flow test.                                                                           |
| T9  | `@a2ui/react` 0.15.0             | Its README examples import from `@a2ui/react/v0_9` and `@a2ui/web_core/v0_9`. Those are protocol v0.9.                                                                                                                                                                                                                                                                            | `grep -rn "v0_9" src/` finds nothing. Use `@a2ui/react` and `@a2ui/web_core/v1_0`.                                                        |
| T10 | `@playwright/test`, each version | Each version needs its own browser revision. Another revision does not start.                                                                                                                                                                                                                                                                                                     | `playwright test` fails with `Executable doesn't exist`. Run `npx playwright install chromium-headless-shell` with the installed version. |
| T11 | `@a2ui/*` 0.15.0                 | `npm audit` on a fresh install of the three `@a2ui` packages reports 6 vulnerabilities (5 high, 1 critical). `dompurify <=3.4.16` is critical, through `@a2ui/markdown-it`, which `@a2ui/react` depends on. `zod <4.6.6` is high, through `@a2ui/web_core`, with "No fix available". Do not run `npm audit fix --force`: it installs `@a2ui/react@0.8.0`. Tell the user about it. | `npm audit`                                                                                                                               |
| T12 | `@a2ui/web_core` 0.15.0          | `EventEmitter.emit` visits a listener that was added while it emits. A component that subscribes to `renderer.model.onAction` on each render runs the write twice for one press. Let the session call the write handler.                                                                                                                                                          | In the test of the flow that writes, assert the write's effect on the app's screen: one press, one write.                                 |
| T13 | `@a2ui/agent` 0.1.0              | It does not print a `.describe()` on the object schema of an app component, and prints an empty `## Positional Function Signatures` heading for the app catalog. A `.describe()` on a property prints.                                                                                                                                                                            | Print the system prompt. Put when to use each component in the app's instructions.                                                        |
| T14 | `@google/genai` 3.0.0            | A held request with no timeout keeps the session busy.                                                                                                                                                                                                                                                                                                                            | Give the session a client that never yields, and a short reply timeout: the turn ends as an error entry, and `busy` is false.             |
| T15 | `@playwright/test` 1.65.0        | A failed test writes `error-context.md` with a snapshot of the page to `test-results/`. The snapshot holds the value of each input, also of a password field. A failed locator assertion takes the snapshot at once, so a hook that runs later cannot clear it.                                                                                                                   | The key check of Key searches `test-results/`. Keep the key field empty (Key).                                                            |
| T16 | `@a2ui/agent` 0.1.0              | It drops `root = <variable>` in an update block (`surface("id", update=true)`). The old root stays, and there is no error entry. The turn rules ask for a component call.                                                                                                                                                                                                         | After an action, the surface still shows its old root, with its button, and no error entry shows.                                         |
| T17 | `@a2ui/agent` 0.1.0              | An Express data path segment holds only letters, digits and `_`. `$/sel/a-b` gives `COMPILATION_ERROR ... token recognition error at: '-b'`. The turn rules say so, and give the list pattern.                                                                                                                                                                                    | An error entry with `token recognition error`.                                                                                            |
| T18 | `@a2ui/agent` 0.1.0              | The prompt marks a property of the action type as `(static)`, also on the basic `Button`. Rule 14 of the prompt makes each parameter named `action` required.                                                                                                                                                                                                                     | Print the system prompt, and read the signature of each app component. See `references/catalog.md`.                                       |
| T19 | `@google/genai` 3.0.0            | `httpOptions.timeout` also covers the read of the streamed body. With 30 s, every attempt of a live action turn failed with `AbortError`.                                                                                                                                                                                                                                         | An error entry with `AbortError` after the timeout. Use 90 s.                                                                             |
| T20 | `@google/genai` 3.0.0            | A replay with fewer responses than requests answers `400`, and the client's retry rule then waits 5 s and 10 s. The test is slow, and ends with an error entry.                                                                                                                                                                                                                   | `requests.length` is larger than the number of responses. Each error turn needs its own response.                                         |
