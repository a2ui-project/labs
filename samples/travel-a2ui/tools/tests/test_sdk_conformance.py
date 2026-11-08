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

"""The catalog the model is shown, as the A2UI SDK prunes it.

`brain/catalog.py` narrows the travel catalog with the SDK's
`ComponentPruningTransformer` and `FunctionPruningTransformer`, and adds the
macros, before the processor writes a prompt from it. These pin what that leaves: exactly
the allow-list in `agent-components.json`, with the unions narrowed to match,
the definitions that make a catalog a catalog intact, and the macros added on
top — so a change to the allow-list, or to the SDK's pruning, shows up here
rather than as a prompt that quietly documents something else.

Run in its own CI job against the newest SDK, so an upstream change to pruning
is caught the day it ships.
"""

from __future__ import annotations

import pathlib
import sys

import pytest

ROOT = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "scripts"))
sys.path.insert(0, str(ROOT / "apps" / "server" / "src"))

pytest.importorskip(
    "a2ui.catalog_transformers",
    reason="the reference A2UI SDK is not installed (pip install a2ui-agent-sdk)",
)

from travel_a2ui.brain.catalog import AGENT_COMPONENTS as ALLOW  # noqa: E402
from travel_a2ui.brain.catalog import CATALOG_JSON, model_catalogs
from travel_a2ui.brain.macros import MACRO_NAMES  # noqa: E402


@pytest.fixture(scope="module")
def source() -> dict:
    return CATALOG_JSON


@pytest.fixture(scope="module")
def shown():
    return model_catalogs()[0]


def _union(document: dict, name: str) -> set[str]:
    return {
        entry["$ref"].rsplit("/", 1)[-1]
        for entry in document["$defs"][name]["oneOf"]
        if isinstance(entry, dict) and "$ref" in entry
    }


def test_only_the_allowed_components_and_the_macros(shown):
    assert set(MACRO_NAMES) == {
        "Booked",
        "Flights",
        "Highlights",
        "Itinerary",
        "Stays",
        "Trip",
    }
    assert set(shown.components) == set(ALLOW["allowedComponents"]) | set(MACRO_NAMES)


def test_only_the_allowed_functions(shown, source):
    assert set(shown.functions) == set(ALLOW["allowedFunctions"]) & set(
        source["functions"]
    )


def test_the_unions_list_what_is_kept(shown):
    document = shown.to_json()
    assert _union(document, "anyComponent") == set(shown.components)
    assert _union(document, "anyFunction") == set(shown.functions)


def test_an_excluded_component_is_never_shown(shown):
    for name in ALLOW["excluded"]:
        assert name not in shown.components, f"{name} is excluded but offered"


def test_the_source_catalog_is_untouched(shown, source):
    assert "Video" in source["components"]
    assert "regex" in source["functions"]


def test_the_catalog_definitions_survive(shown):
    """`anyComponent` and `anyFunction` are pointed at from outside the catalog.

    A pruning pass that treated "unreferenced inside" as "unused" would delete
    exactly the definitions that make a catalog a catalog.
    """
    assert {"anyComponent", "anyFunction"} <= set(shown.to_json()["$defs"])
