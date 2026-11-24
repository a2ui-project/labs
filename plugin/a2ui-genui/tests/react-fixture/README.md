# React fixture

A small Vite and React app of the kind that the `a2ui-genui` skill makes,
with one flow for each placement. Its tests prove the rules of
`../../skills/a2ui-genui/references/stacks/react.md` on the SDK versions in
`package.json`. The skill does not install it.

The tests answer the model requests of the page with `page.route`
(`tests/replay.ts`). So the app runs its real model client, and no request
leaves the machine.

```bash
npm ci
npx playwright install chromium-headless-shell
npm test
```

Node 20.11 or later. The tests use port 4189.

| Spec                    | Subject                                                      |
| ----------------------- | ------------------------------------------------------------ |
| `recorded-turn.spec.ts` | The conversation: surface, action, read tool, rejected block |
| `standing.spec.ts`      | The side panel and the home region                           |
| `host-action.spec.ts`   | One press, one write. Failed writes and held replies.        |
| `replay.spec.ts`        | The record and replay method                                 |
| `sdk-traps.spec.ts`     | SDK behavior that the stack file warns about                 |
| `key-leak.spec.ts`      | A failed run leaves no copy of the key in `test-results/`    |
| `*.record.spec.ts`      | Record tests. They run only with `A2UI_RECORD_KEY`.          |

The `live*.json` fixtures are recordings of `gemini-3.6-flash` from
2026-11-13. The other fixtures are written by hand.

To record again:

```bash
A2UI_RECORD_KEY="$GEMINI_API_KEY" npx playwright test tests/live.record.spec.ts tests/live-standing.record.spec.ts
```
