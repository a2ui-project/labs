#!/usr/bin/env bash
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

set -euo pipefail

TARGET_PLUGIN_DIR="${HOME}/.gemini/config/plugins/a2ui-pane"

if [ -L "${TARGET_PLUGIN_DIR}" ]; then
  rm "${TARGET_PLUGIN_DIR}"
  echo "Removed symlink at ${TARGET_PLUGIN_DIR}"
elif [ -d "${TARGET_PLUGIN_DIR}" ]; then
  echo "Target ${TARGET_PLUGIN_DIR} is a real directory, not removing automatically."
  exit 1
else
  echo "No existing installation found at ${TARGET_PLUGIN_DIR}"
fi

echo "✨ Successfully uninstalled a2ui-pane plugin."
