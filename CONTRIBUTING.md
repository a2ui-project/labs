# Contributing to A2UI Labs

We welcome contributions to A2UI Labs!

## Before You Begin

### Contributor License Agreement (CLA)

Contributions to this project must be accompanied by a [Contributor License Agreement](https://cla.developers.google.com/about) (CLA). You (or your employer) retain the copyright to your contribution; this gives us permission to use and redistribute your contributions as part of the project.

If you have already signed the Google CLA (even for another project), you do not need to sign it again. Visit <https://cla.developers.google.com/> to check or sign.

### Community Guidelines

This project adheres to [Google's Open Source Community Guidelines](https://opensource.google/conduct/).

---

## Pre-submit Verification

Before submitting a Pull Request, check license headers and formatting. CI runs
both checks on every pull request.

### License Headers

Verify that all source files include proper Apache 2.0 license headers. The
script needs Python 3.10 or later, and installs
[addlicense](https://github.com/google/addlicense) with Go if it is missing:

```bash
python3 ./scripts/fix_licenses.py --check
```

To automatically apply headers to new files:

```bash
python3 ./scripts/fix_licenses.py
```

### Formatting

Check formatting:

```bash
./scripts/fix_format.sh --check
```

To format all files:

```bash
./scripts/fix_format.sh
```

The script needs Node.js. It also needs the Dart SDK if the repository has Dart
files, and [uv](https://docs.astral.sh/uv/) if it has Python files. Locally, it
skips a language whose tool is missing.

---

## Code Quality & Formatting

Sub-projects (such as `typescript-starter`, `flutter-starter`, or individual packages in `samples/`) are independent and maintain their own local dependencies and tests.

`scripts/fix_format.sh` formats them as follows:

1. Markdown, YAML, JSON, JavaScript, TypeScript, CSS, and HTML files are
   formatted with Prettier and the root `.prettierrc`.
2. Dart files are formatted with `dart format`.
3. Python files are formatted with Ruff. Add a `[tool.ruff]` section to the
   sub-project's `pyproject.toml` to change its settings.
4. A sub-project whose `package.json` defines both a `format` and a
   `format:check` script owns its formatting. The script runs those scripts
   with the sub-project's own package manager and tool versions instead of
   the root Prettier. Use this for code that already has its own formatter
   configuration, such as a fork of an existing project.

Please ensure that tests and formatting commands pass for the specific sub-project you are modifying before opening a PR.

---

## Pull Request Guidelines

1. Keep pull requests focused and atomic.
2. Provide a clear description and link related issues.
3. Ensure CI checks (`Presubmit Lint`) pass.
