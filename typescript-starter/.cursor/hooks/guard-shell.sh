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

# Cursor `beforeShellExecution` adapter.
#
# Translates Cursor's hook I/O to the shared guard in
# scripts/agent-hooks/git-guard.sh. Cursor input on stdin: { command, cwd, ... }.
# Output on stdout: { permission: "allow" | "deny", userMessage, agentMessage }.

# jq is a hard prerequisite — even deny() below needs it to build JSON — so
# fail closed with a static deny instead of emitting nothing at all.
command -v jq >/dev/null 2>&1 || {
  printf '%s\n' '{"permission":"deny","userMessage":"Blocked by repo policy","agentMessage":"The agent hooks require jq, which was not found on PATH. Install jq (https://jqlang.org) and retry."}'
  exit 0
}

input=$(cat)
ROOT=$(CDPATH= cd "$(dirname "$0")/../.." && pwd)

deny() {
  jq -n --arg m "$1" \
    '{permission:"deny", userMessage:"Blocked by repo policy", agentMessage:$m}'
  exit 0
}
allow() {
  jq -n '{permission:"allow"}'
  exit 0
}

# Fail closed: a malformed payload (jq parse failure / missing command) must
# deny, not silently allow.
cmd=$(printf '%s' "$input" | jq -re '.command // empty') ||
  deny "Invalid Cursor hook payload: could not read .command."
cwd=$(printf '%s' "$input" | jq -r '.cwd // ""')

# Cursor passes cwd rather than a literal `cd packages/...`, so catch
# yarn-run-from-a-workspace here before delegating.
case "$cwd" in
  "$ROOT"/packages | "$ROOT"/packages/*)
    case "$cmd" in
      yarn* | *" yarn "*)
        deny "Run yarn from the repo root, not a child workspace (AGENTS.md). Use 'yarn workspace <name> <cmd>' from $ROOT." ;;
    esac ;;
esac

# Delegate the git-safety checks to the shared guard (reads .tool_input.command).
# Fail closed: deny on a block (exit 2) AND on any unexpected guard failure.
status=0
err=$(printf '{"tool_input":{"command":%s}}' "$(jq -n --arg c "$cmd" '$c')" |
  "$ROOT/scripts/agent-hooks/git-guard.sh" 2>&1) || status=$?
case "$status" in
  0) allow ;;
  2) deny "$err" ;;
  *) deny "git-guard failed (exit $status): $err" ;;
esac
