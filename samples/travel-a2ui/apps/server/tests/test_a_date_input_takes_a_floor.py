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
"""A date input can say the earliest day it takes.

The basic catalog wrote `DateTimeInput.min` and `max` as exactly one of three
formats, and a validator that does not check formats finds every string valid
under all three, so `oneOf` refused any literal date at all. The model drew a
departure picker that could not go back in time, the whole form was refused,
and the turn ended on half a surface. The catalog now says any one of them.
"""

from __future__ import annotations

import pytest

from helpers import drawn


@pytest.mark.parametrize(
    "floor",
    ['"2026-11-15"', '"2026-11-15T00:00:00Z"', '"09:30:00"'],
)
def test_a_literal_floor_is_accepted(floor: str) -> None:
    messages = drawn(
        'surface("inline-1", sendDataModel=true)\n'
        f'out = DateTimeInput($/trip/startDate, true, false, {floor}, _, "Out")\n'
        "root = Column([out])"
    )
    components = [
        component
        for message in messages
        for component in (
            message.get("createSurface") or message.get("updateComponents") or {}
        ).get("components", [])
    ]
    picker = next(c for c in components if c.get("component") == "DateTimeInput")
    assert picker["min"] == floor.strip('"')
