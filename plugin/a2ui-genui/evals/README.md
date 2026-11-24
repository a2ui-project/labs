# Eval harness

This folder grades the `a2ui-genui` skill. A trial runs a coding agent with
the skill on a sample app, then runs the pass conditions. The harness does
not trust a status that the agent wrote.

| Case                 | App                            | Commit    | App root                  | Stack   |
| -------------------- | ------------------------------ | --------- | ------------------------- | ------- |
| `actual-budget.json` | `actualbudget/actual` v26.10.0 | `2bebdba` | `packages/desktop-client` | React   |
| `compass.json`       | `flutter/samples`              | `c6e58ab` | `compass_app/app`         | Flutter |

## Run a trial

```bash
export GEMINI_API_KEY=...
node run-trial.mjs compass.json codex /tmp/a2ui-evals/codex-compass-1
node run-trial.mjs actual-budget.json claude /tmp/a2ui-evals/claude-actual-1
node report.mjs /tmp/a2ui-evals
```

Use a new out-dir for each trial, and a key on a paid plan. The runner
writes `result.json`, `agent.log` and one `<condition>.log` for each failed
condition. `--grade-only` as a fourth argument grades a trial again.

The runner does these steps:

1. It clones the app at the commit of the case.
2. It installs the skill for the agent.
3. It starts the agent with the prompt and the `standing_answers` of the
   case, because a headless agent cannot ask questions. One answer gives the
   exact SDK versions, so each trial installs the same ones.
4. It runs each pass condition in the app root.

## Pass conditions

A trial passes when each condition exits 0.

| Condition                 | Check                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `blueprint_valid`         | `a2ui.blueprint.json` obeys `blueprint.schema.json`                                |
| `placements_match`        | The three flows are one `inline`, one `sidebar` and one `home` flow                |
| `flows_pass_three_runs`   | The `test_command` of each flow exits 0 three times in a row                       |
| `key_check`               | No file of the app holds the key. Only this condition gets the key.                |
| `sdk_versions_locked`     | The lock file holds the SDK versions of the case                                   |
| `no_hand_built_messages`  | The app builds no A2UI message by hand                                             |
| `agent_output_has_no_key` | No file in the out-dir holds the key. The runner adds this condition to each case. |

`placements_match` reads the blueprint, not the screen.

A trial is `invalid` when the agent exits with an error, for example on a
usage limit. `report.mjs` lists it and does not count it.

## Metrics

pass@1 is the fraction of the trials of a case that pass. pass^3 is 1 when
three trials in a row pass.

## Agents and settings

| Agent    | Skill folder in the clone   | How it runs                                                        |
| -------- | --------------------------- | ------------------------------------------------------------------ |
| `codex`  | `.agents/skills/a2ui-genui` | `codex exec` with the `workspace-write` sandbox and network access |
| `claude` | `.claude/skills/a2ui-genui` | `claude -p` with `--permission-mode auto`                          |

| Variable                       | Use                                                                         | Default                |
| ------------------------------ | --------------------------------------------------------------------------- | ---------------------- |
| `A2UI_EVAL_MODEL`              | The model of the agent                                                      | `opus` for Claude Code |
| `A2UI_EVAL_TIMEOUT_MIN`        | The time limit of the agent                                                 | 120                    |
| `A2UI_EVAL_FLOW_TIMEOUT_MIN`   | The time limit of one flow test run                                         | 30                     |
| `A2UI_EVAL_WRITABLE`           | More writable folders for the Codex sandbox, with `:` between them          | The package caches     |
| `A2UI_EVAL_CODEX_NO_SANDBOX=1` | Codex with no sandbox. The Actual Budget case needs it on macOS (Chromium). | Off                    |

Use `A2UI_EVAL_CODEX_NO_SANDBOX` only where the agent can have full access.

Run one trial at a time, and keep the computer awake. A trial of Actual
Budget uses about 3 GB of disk.

## Not built yet

- A container and CI for the trials.
- Cases for the other two sample apps.
- Cursor and Antigravity in the runner.
