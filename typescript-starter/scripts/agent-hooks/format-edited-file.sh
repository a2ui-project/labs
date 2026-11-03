#!/bin/sh
# Copyright 2024 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

# Agent hook (PostToolUse / afterFileEdit), shared across Claude, Codex, Cursor.
#
# Formats and lints just the single file the agent edited, so generated code
# stays consistent with oxfmt/oxlint without relying on the agent remembering to
# run `yarn lint:fix`. See AGENTS.md "Agent hooks".
#
# `--type-aware` is intentionally skipped here to keep the edit loop fast; the
# type-aware pass still runs at commit time via nano-staged.

. "$(dirname "$0")/common.sh"
require_jq advisory

file=$(jq -r '.tool_input.file_path // empty')
[ -n "$file" ] && [ -f "$file" ] || exit 0

# Resolve the repo root regardless of which agent invoked us.
ROOT=$(resolve_repo_root "$(dirname "$file")")
BIN="$ROOT/node_modules/.bin"
[ -x "$BIN/oxfmt" ] || exit 0

case "$file" in
  *.js | *.mjs | *.jsx | *.ts | *.tsx | *.md | *.json | *.yml | *.yaml)
    "$BIN/oxfmt" --no-error-on-unmatched-pattern "$file" >/dev/null 2>&1
    ;;
esac

case "$file" in
  *.js | *.mjs | *.jsx | *.ts | *.tsx)
    "$BIN/oxlint" --fix --quiet "$file" >/dev/null 2>&1
    ;;
esac

exit 0
