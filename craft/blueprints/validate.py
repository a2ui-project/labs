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

"""Validates the Craft blueprints with A2UI's blueprint validator.

A2UI's validator checks the blueprints next to its own file, so this runs it
as if it lived in this folder.
"""

import importlib.util
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
VALIDATOR = os.path.join(
    HERE, "..", "..", "third_party", "a2ui", "blueprints", "validate_blueprints.py"
)

if not os.path.exists(VALIDATOR):
    sys.exit(
        "Error: the A2UI submodule at third_party/a2ui is missing. Run:\n"
        "  git submodule update --init third_party/a2ui"
    )

spec = importlib.util.spec_from_file_location("validate_blueprints", VALIDATOR)
validator = importlib.util.module_from_spec(spec)
spec.loader.exec_module(validator)
validator.__file__ = os.path.join(HERE, "validate_blueprints.py")
validator.main()
