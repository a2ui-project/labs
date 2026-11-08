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

"""Prints the projects that the presubmit tests run, by language, as JSON.

A project is the outermost directory with a manifest of its language, so a
monorepo is tested once from its root. Node.js projects count only when they
have a test script. Each line is "<language>=<JSON list>", ready to append to
$GITHUB_OUTPUT.
"""

import json
import os
import subprocess

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# The manifest file names that mark a project, by language.
MANIFESTS = {
    "node": ["package.json"],
    "python": ["pyproject.toml"],
    "dart": ["pubspec.yaml"],
    "swift": ["Package.swift"],
    "kotlin": ["settings.gradle.kts"],
}

# Flutter and Capacitor generate these folders inside a project of another
# language. They build the app for one platform and have no tests of their
# own, so their manifests don't mark a project.
PLATFORM_FOLDERS = {"android", "ios", "macos"}


def tracked_files():
    output = subprocess.run(
        ["git", "ls-files", "--cached", "--others", "--exclude-standard"],
        cwd=REPO_ROOT,
        check=True,
        capture_output=True,
        text=True,
    ).stdout
    return [
        path
        for path in output.splitlines()
        if not path.startswith("third_party/")
        # Files deleted from disk stay listed until the deletion is staged.
        and os.path.isfile(os.path.join(REPO_ROOT, path))
    ]


def in_platform_folder(directory, project_directories):
    """Returns whether the directory is inside a platform folder of a project."""
    for project in project_directories:
        for folder in PLATFORM_FOLDERS:
            prefix = folder if project == "." else f"{project}/{folder}"
            if directory == prefix or directory.startswith(prefix + "/"):
                return True
    return False


def outermost(directories):
    """Returns the directories that aren't inside another of the directories."""
    result = []
    for directory in sorted(set(directories), key=lambda d: (d != ".", d.count("/"))):
        if not any(
            parent == "." or directory.startswith(parent + "/") for parent in result
        ):
            result.append(directory)
    return sorted(result)


def node_project(directory):
    """Describes a Node.js project, or returns None when it has no tests."""
    with open(os.path.join(REPO_ROOT, directory, "package.json")) as f:
        if "test" not in (json.load(f).get("scripts") or {}):
            return None
    node_version = "22"
    for name in (".nvmrc", ".node-version"):
        path = os.path.join(REPO_ROOT, directory, name)
        if os.path.exists(path):
            with open(path) as f:
                node_version = f.read().strip().lstrip("v")
            break
    return {"path": directory, "node-version": node_version}


def main():
    files = tracked_files()
    manifest_directories = {
        language: {
            os.path.dirname(path) or "."
            for path in files
            if os.path.basename(path) in names
        }
        for language, names in MANIFESTS.items()
    }
    all_directories = set().union(*manifest_directories.values())
    for language, directories in manifest_directories.items():
        directories = [
            d for d in directories if not in_platform_folder(d, all_directories)
        ]
        if language == "node":
            # Describe the projects before picking the outermost, so a parent
            # package.json without tests doesn't hide the projects inside it.
            projects = [p for p in map(node_project, directories) if p]
            paths = outermost(p["path"] for p in projects)
            projects = [p for p in projects if p["path"] in paths]
        else:
            projects = [{"path": d} for d in outermost(directories)]
        print(f"{language}={json.dumps(projects)}")


if __name__ == "__main__":
    main()
