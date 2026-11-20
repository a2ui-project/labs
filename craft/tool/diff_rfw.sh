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

# Shows how Craft's fork of an RFW file differs from RFW 2.0.0, ignoring
# formatting: both copies are formatted the same way before the diff.
#
# Usage: craft/tool/diff_rfw.sh [file ...]
#   file: a name in craft/packages/a2ui_craft/lib/src/rfw/ (default: all).

set -euo pipefail

CRAFT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FORK="$CRAFT/packages/a2ui_craft/lib/src/rfw"
UPSTREAM="$CRAFT/third_party/rfw/lib/src/dart"

if [[ $# -eq 0 ]]; then
  set -- $(cd "$FORK" && ls *.dart)
fi

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
mkdir -p "$TMP/rfw" "$TMP/craft"
for file in "$@"; do
  cp "$UPSTREAM/$file" "$TMP/rfw/$file"
  cp "$FORK/$file" "$TMP/craft/$file"
done
# The language version only picks the formatting style; both copies use it.
dart format --language-version=3.8 "$TMP" >/dev/null
status=0
(cd "$TMP" && diff -u -r rfw craft) || status=$?
# diff exits with 1 when the files differ.
[[ $status -le 1 ]]
