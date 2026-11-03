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

Before submitting a Pull Request, ensure that license headers are valid:

### License Headers
Verify that all source files include proper Apache 2.0 license headers:
```bash
python3 ./scripts/fix_licenses.py --check
```
To automatically apply headers to new files:
```bash
python3 ./scripts/fix_licenses.py
```

---

## Code Quality & Formatting

Sub-projects (such as `typescript-starter`, `flutter-starter`, or individual packages in `samples/`) are independent and maintain their own local dependencies, tests, and formatting tools. 

Please ensure that tests and formatting commands pass for the specific sub-project you are modifying before opening a PR.

---

## Pull Request Guidelines

1. Keep pull requests focused and atomic.
2. Provide a clear description and link related issues.
3. Ensure CI checks (`Presubmit Lint`) pass.
