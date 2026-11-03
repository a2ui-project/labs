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

# Formats the repository, or checks its formatting with --check.
#
# Sub-projects in this repository are independent, so this script delegates:
#
# 1. A directory whose package.json defines a `format:check` script owns its
#    formatting. The script runs that sub-project's `format` or `format:check`
#    script with the sub-project's own package manager and tool versions, and
#    root Prettier skips the directory.
# 2. Prettier formats every other Markdown, YAML, JSON, JavaScript, TypeScript,
#    CSS, and HTML file with the root .prettierrc.
# 3. `dart format` formats Dart files. It reads each package's language version.
# 4. Ruff formats Python files. It reads each directory's nearest
#    pyproject.toml or ruff.toml.

set -eEuo pipefail

failure() {
  local exit_code=$?
  echo "===================================================="
  echo "❌ ERROR: fix_format.sh failed on line ${BASH_LINENO[0]} with exit status $exit_code"
  echo "Command: ${BASH_COMMAND}"
  echo "===================================================="
  exit "$exit_code"
}
trap 'failure' ERR

CHECK_ONLY=false
if [[ "${1:-}" == "--check" ]]; then
  CHECK_ONLY=true
fi

PRETTIER_VERSION=3.8.4
RUFF_VERSION=0.15.12

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

# In --check mode a missing formatter fails the run, so CI cannot pass by
# skipping a language. Locally, it only prints a warning.
missing_tool() {
  if [ "$CHECK_ONLY" = true ]; then
    echo "Error: $1 is required to check formatting of $2." >&2
    exit 1
  fi
  echo "Warning: $1 not found. Skipping formatting of $2."
}

# Prints, NUL-separated, the files matching the given pathspecs that are tracked
# or untracked but not ignored, and still exist.
list_files() {
  git ls-files -z --cached --others --exclude-standard -- "$@" |
    while IFS= read -r -d '' file; do
      if [ -f "$file" ]; then printf '%s\0' "$file"; fi
    done
}

has_files() {
  [ -n "$(list_files "$@" | head -c 1)" ]
}

if ! command -v npx >/dev/null 2>&1; then
  echo "Error: Node.js (npx) is required to run Prettier." >&2
  exit 1
fi

# Runs a package.json script with the package manager that the sub-project's
# lockfile names, installing dependencies first if they are missing. Uses
# Corepack when it is available, so the version in the sub-project's
# `packageManager` field runs.
run_package_script() {
  local dir="$1" script="$2" pm=(npm) install=(npm install) corepack=()
  if command -v corepack >/dev/null 2>&1; then
    corepack=(corepack)
  fi
  if [ -f "$dir/yarn.lock" ]; then
    pm=(${corepack[@]+"${corepack[@]}"} yarn)
    install=("${pm[@]}" install --immutable)
  elif [ -f "$dir/pnpm-lock.yaml" ]; then
    pm=(${corepack[@]+"${corepack[@]}"} pnpm)
    install=("${pm[@]}" install --frozen-lockfile)
  elif [ -f "$dir/package-lock.json" ]; then
    install=(npm ci)
  fi
  (
    cd "$dir"
    if [ ! -d node_modules ]; then
      "${install[@]}"
    fi
    "${pm[@]}" run "$script"
  )
}

OWNED_DIRS=()
while IFS= read -r package_json; do
  if node -e 'process.exit(require(process.argv[1]).scripts?.["format:check"] ? 0 : 1)' \
    "$REPO_ROOT/$package_json"; then
    OWNED_DIRS+=("$(dirname "$package_json")")
  fi
done < <(git ls-files -- '*/package.json')

for dir in ${OWNED_DIRS[@]+"${OWNED_DIRS[@]}"}; do
  echo "Running the format scripts of $dir..."
  if [ "$CHECK_ONLY" = true ]; then
    run_package_script "$dir" format:check
  else
    run_package_script "$dir" format
  fi
done

echo "Running Prettier..."
PRETTIER=(npx --yes "prettier@$PRETTIER_VERSION" --config .prettierrc)
PRETTIER_TARGETS=(.)
for dir in ${OWNED_DIRS[@]+"${OWNED_DIRS[@]}"}; do
  PRETTIER_TARGETS+=("!$dir/**")
done
if [ "$CHECK_ONLY" = true ]; then
  "${PRETTIER[@]}" --check "${PRETTIER_TARGETS[@]}"
else
  "${PRETTIER[@]}" --write "${PRETTIER_TARGETS[@]}" | sed '/ (unchanged)$/d'
fi

if has_files '*.dart'; then
  echo "Running dart format..."
  if command -v dart >/dev/null 2>&1; then
    if [ "$CHECK_ONLY" = true ]; then
      list_files '*.dart' | xargs -0 dart format --output=none --set-exit-if-changed
    else
      list_files '*.dart' | xargs -0 dart format
    fi
  else
    missing_tool dart "Dart files"
  fi
fi

if has_files '*.py'; then
  echo "Running Ruff..."
  if command -v uvx >/dev/null 2>&1; then
    if [ "$CHECK_ONLY" = true ]; then
      uvx "ruff@$RUFF_VERSION" format --check .
    else
      uvx "ruff@$RUFF_VERSION" format .
    fi
  else
    missing_tool uvx "Python files"
  fi
fi

echo "Done."
