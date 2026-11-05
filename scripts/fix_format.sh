#!/usr/bin/env bash
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

# Formats the files in this repository the way A2UI formats its own, or checks
# the formatting with --check. The formatter settings come from the A2UI
# submodule at third_party/a2ui.
#
# Files are listed with git, so every .gitignore in the repository applies. A
# formatter only runs when the repository has files in its language. As in
# A2UI, Prettier and Pyink are required, and the other formatters are skipped
# with a warning when they aren't installed. In CI, where the CI environment
# variable is set, a missing formatter is an error instead.

set -euo pipefail

CHECK_ONLY=false
if [[ "${1:-}" == "--check" ]]; then
  CHECK_ONLY=true
fi

cd "$(dirname "$0")/.."
A2UI=third_party/a2ui
if [[ ! -f "$A2UI/.prettierrc" ]]; then
  echo "Error: the A2UI submodule at $A2UI is missing. Run:" >&2
  echo "  git submodule update --init --remote" >&2
  exit 1
fi

# Warns that a formatter is missing and skips it, or fails in CI.
# Arguments: the problem, and what is skipped.
missing_formatter() {
  if [[ -n "${CI:-}" ]]; then
    echo "Error: $1" >&2
    exit 1
  fi
  echo "Warning: $1 Skipping $2."
}

# Prints the files that git lists and that exist on disk, matching the given
# pathspecs, separated by NUL characters.
list_files() {
  git ls-files -z --cached --others --exclude-standard -- "$@" |
    while IFS= read -r -d '' file; do
      if [[ -f "$file" ]]; then
        printf '%s\0' "$file"
      fi
    done
}

echo "Running Prettier..."
if [[ "$CHECK_ONLY" == true ]]; then
  PRETTIER_MODE=--check
else
  PRETTIER_MODE=--write
fi
list_files | xargs -0 npx --yes prettier@3.8.4 "$PRETTIER_MODE" --config "$A2UI/.prettierrc" \
  --ignore-unknown --no-error-on-unmatched-pattern --log-level warn

# Pyink applies the extend-exclude setting of A2UI only to the folders it walks,
# not to files passed by name, so leave out generated code here.
PYTHON_FILES=()
while IFS= read -r -d '' file; do PYTHON_FILES+=("$file"); done < <(
  list_files '*.py' '*.pyi' ':(exclude,glob)**/generated/**'
)
if [[ ${#PYTHON_FILES[@]} -gt 0 ]]; then
  echo "Running Pyink..."
  # The Pyink version and settings are the ones in A2UI's uv.lock and pyproject.toml.
  PYINK=(uv run --project "$A2UI" --frozen --only-group dev
    pyink --config "$A2UI/pyproject.toml")
  if [[ "$CHECK_ONLY" == true ]]; then
    "${PYINK[@]}" --check "${PYTHON_FILES[@]}"
  else
    "${PYINK[@]}" "${PYTHON_FILES[@]}"
  fi
fi

DART_FILES=()
while IFS= read -r -d '' file; do DART_FILES+=("$file"); done < <(list_files '*.dart')
if [[ ${#DART_FILES[@]} -gt 0 ]]; then
  if command -v dart >/dev/null 2>&1; then
    echo "Running Dart format..."
    # Without a language version, "dart format" reads it from the package
    # config, which exists only after "dart pub get". CI doesn't run it, so
    # pin the version to format the same way with and without it. A2UI pins
    # the same version for its Flutter packages.
    DART_FORMAT=(dart format --language-version=3.10)
    if [[ "$CHECK_ONLY" == true ]]; then
      "${DART_FORMAT[@]}" --output=none --set-exit-if-changed "${DART_FILES[@]}"
    else
      "${DART_FORMAT[@]}" "${DART_FILES[@]}"
    fi
  else
    missing_formatter "dart command not found." "Dart formatting"
  fi
fi

SWIFT_FILES=()
while IFS= read -r -d '' file; do SWIFT_FILES+=("$file"); done < <(list_files '*.swift')
if [[ ${#SWIFT_FILES[@]} -gt 0 ]]; then
  if command -v swift-format >/dev/null 2>&1; then
    if [[ "$CHECK_ONLY" == true ]]; then
      echo "Linting Swift files..."
      # Without --strict, formatting issues are warnings and don't fail.
      swift-format lint --strict "${SWIFT_FILES[@]}"
    else
      echo "Formatting Swift files..."
      swift-format format -i "${SWIFT_FILES[@]}"
    fi
  else
    missing_formatter "swift-format command not found." "Swift formatting"
  fi
fi

# As in A2UI, Kotlin is formatted by the ktfmt Gradle plugin of each project
# that applies it. In a project with several modules, the plugin is applied in
# a module, and Gradle runs from the closest folder above it with a wrapper.
KTFMT_PROJECTS=()
while IFS= read -r -d '' file; do
  if grep -q ktfmt "$file"; then
    project=$(dirname "$file")
    while [[ "$project" != . && ! -f "$project/gradlew" ]]; do
      project=$(dirname "$project")
    done
    if [[ ! -f "$project/gradlew" ]]; then
      project=$(dirname "$file")
    fi
    if [[ ! " ${KTFMT_PROJECTS[*]-} " =~ " $project " ]]; then
      KTFMT_PROJECTS+=("$project")
    fi
  fi
done < <(list_files 'build.gradle.kts' '*/build.gradle.kts')
if [[ ${#KTFMT_PROJECTS[@]} -gt 0 ]]; then
  # macOS has a /usr/bin/java stub that fails when no JDK is installed, so
  # check that Java runs rather than that the command exists.
  if java -version >/dev/null 2>&1; then
    echo "Running ktfmt..."
    for project in "${KTFMT_PROJECTS[@]}"; do
      (
        cd "$project"
        if [[ -f ./gradlew ]]; then
          # The wrapper isn't always committed as executable.
          GRADLE=(sh ./gradlew)
        elif command -v gradle >/dev/null 2>&1; then
          GRADLE=(gradle)
        else
          missing_formatter "neither ./gradlew nor gradle found in $project." "Kotlin formatting there"
          exit 0
        fi
        if [[ "$CHECK_ONLY" == true ]]; then
          "${GRADLE[@]}" -q ktfmtCheck
        else
          "${GRADLE[@]}" -q ktfmtFormat
        fi
      )
    done
  else
    missing_formatter "no Java runtime found." "Kotlin formatting"
  fi
fi
