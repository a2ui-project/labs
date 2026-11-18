# A2UI Labs agent guide

This repository holds starter projects, samples, and tools for [A2UI](https://a2ui.org).
Each top-level folder is a separate area or project:

1. `plugin/`: Gen UI plugins for coding agents:
   - `plugin/a2ui-pane/`: the A2UI viewer plugin and `genui` skill (`README.md`).
2. `samples/`: runnable samples and starter projects, each in its own folder with a `README.md`:
   - `samples/typescript-starter/`: the TypeScript starter project. Read its own
     `AGENTS.md` before working in it.
   - `samples/flutter-starter/`: the Flutter starter project.

## The A2UI submodule

The latest `main` of the [A2UI repository](https://github.com/a2ui-project/a2ui)
is a git submodule at `third_party/a2ui`. The formatter settings, the license
script, the CI setup actions, and the agent skills come from it. Fetch or
update it before running the scripts below:

```bash
git submodule update --init --remote
```

Don't edit files under `third_party/`. Propose changes to them in the A2UI
repository.

## Skills

Before a task, read the skill in `.agents/skills/` that matches it:

1. For writing or reviewing code: `coding-principles`.
2. For preparing or reviewing a pull request: `pr-hygiene`.
3. For READMEs, documentation, and PR descriptions: `natural-writing`.
4. For writing or reviewing tests: `a2ui-test-quality-check`.

The skills come from A2UI, so some of their examples refer to A2UI's folders.

## Checks

Run these from the repository root before sending a pull request:

```bash
./scripts/fix_format.sh       # Formats every language; --check only checks.
./scripts/fix_licenses.py     # Adds license headers; --check only checks.
```

CI runs both with `--check`, and runs the tests of every project it finds with
`scripts/find_test_projects.py`.
