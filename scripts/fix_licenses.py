#!/usr/bin/env python3
# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     https://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

"""Runs the A2UI license script on this repository, with extra ignore patterns."""

import importlib.util
import os
import subprocess
import sys

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
A2UI_SCRIPT = os.path.join(
    REPO_ROOT, "third_party", "a2ui", "scripts", "fix_licenses.py"
)

if not os.path.isfile(A2UI_SCRIPT):
    sys.exit(
        "Error: the A2UI submodule at third_party/a2ui is missing. Run:\n"
        "  git submodule update --init --remote"
    )

# Load the A2UI script by path, so that it can't resolve to this file, which
# has the same name. The A2UI script finds the repository root from its own
# path, so point its __file__ here before it runs.
_spec = importlib.util.spec_from_file_location("a2ui_fix_licenses", A2UI_SCRIPT)
fix_licenses = importlib.util.module_from_spec(_spec)
fix_licenses.__file__ = os.path.abspath(__file__)
_spec.loader.exec_module(fix_licenses)


def ignored_paths():
    """Returns patterns for the files on disk that git ignores.

    addlicense walks the files on disk, so without these patterns it would also
    check build and test output, which each project lists in its .gitignore.
    """
    output = subprocess.run(
        [
            "git",
            "ls-files",
            "--others",
            "--ignored",
            "--exclude-standard",
            "--directory",
        ],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    return [path + "**" if path.endswith("/") else path for path in output.splitlines()]


fix_licenses.IGNORE_PATTERNS += [
    # Yarn releases are vendored, minified JavaScript.
    "**/.yarn/**",
    # Test fixtures keep their exact content.
    "**/mocks/**",
    *ignored_paths(),
]

if __name__ == "__main__":
    fix_licenses.main()
