#!/bin/sh
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

# Agent hook (PostToolUse / afterFileEdit), shared across Claude, Codex, Cursor.
#
# Lints and formats just the single file the agent edited, so the agent's
# edits pass oxlint and Prettier without relying on the agent remembering to
# run `yarn lint:fix` and `scripts/fix_format.sh`. See AGENTS.md "Agent hooks".
# Prettier reads its settings from the root of the A2UI Labs repository.
#
# `--type-aware` is intentionally skipped here to keep the edit loop fast; the
# type-aware pass still runs at commit time via nano-staged.

. "$(dirname "$0")/common.sh"
require_jq advisory

file=$(jq -r '.tool_input.file_path // empty')
[ -n "$file" ] && [ -f "$file" ] || exit 0

# This project is a folder of the A2UI Labs repository, so find its root from
# the path of this script rather than with git.
ROOT=$(CDPATH= cd "$(dirname "$0")/../.." && pwd)
BIN="$ROOT/node_modules/.bin"
[ -x "$BIN/oxlint" ] || exit 0

case "$file" in
  *.js | *.mjs | *.jsx | *.ts | *.tsx)
    "$BIN/oxlint" --fix --quiet "$file" >/dev/null 2>&1
    ;;
esac

# Prettier runs after oxlint, whose fixes don't follow the Prettier settings.
case "$file" in
  *.js | *.mjs | *.jsx | *.ts | *.tsx | *.md | *.json | *.yml | *.yaml)
    npx --yes prettier@3.8.4 --write "$file" >/dev/null 2>&1
    ;;
esac

exit 0
