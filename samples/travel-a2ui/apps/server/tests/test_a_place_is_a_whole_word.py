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
"""A place named in a sentence is found only as a whole word.

The fixture provider finds "a few days in Madrid" by looking for a known name
inside the phrase. Inside another word, a short alias is a coincidence: "chill
weekend" came back as Chicago ("chi") and "transfer" as San Francisco ("sf").
"""

from __future__ import annotations

import pytest

from travel_a2ui.brain.providers.fixture.places import _resolve


@pytest.mark.parametrize(
    ("query", "place"),
    [
        ("a few days in Madrid", "Madrid"),
        ("a weekend in chicago", "Chicago"),
        ("nyc", "New York"),
        ("sf", "San Francisco"),
    ],
)
def test_a_named_place_is_found(query: str, place: str) -> None:
    assert (_resolve(query) or {}).get("city") == place


@pytest.mark.parametrize(
    ("query", "not_place"),
    [("chill weekend", "Chicago"), ("transfer", "San Francisco")],
)
def test_a_place_inside_another_word_is_not(query: str, not_place: str) -> None:
    assert (_resolve(query) or {}).get("city") != not_place
