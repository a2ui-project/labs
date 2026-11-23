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

"""Validates the Craft conformance suites against conformance_schema.json."""

import json
from pathlib import Path

import jsonschema
import pytest
import yaml


def load_json_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def load_yaml_file(path):
    with open(path, "r", encoding="utf-8") as f:
        return yaml.safe_load(f)


CONFORMANCE_DIR = Path(__file__).resolve().parent.parent
SCHEMA = load_json_file(CONFORMANCE_DIR / "conformance_schema.json")
VALIDATOR = jsonschema.Draft202012Validator(SCHEMA)


def get_yaml_files():
    return sorted((CONFORMANCE_DIR / "craft").glob("*.yaml"))


def validate_conformance_yaml(yaml_path):
    cases = load_yaml_file(yaml_path)
    VALIDATOR.validate(cases)
    names = [case["name"] for case in cases]
    duplicates = sorted({name for name in names if names.count(name) > 1})
    if duplicates:
        raise ValueError(f"duplicate case names: {duplicates}")


def test_schema_is_valid():
    jsonschema.Draft202012Validator.check_schema(SCHEMA)


def test_there_are_suites():
    assert get_yaml_files()


@pytest.mark.parametrize("yaml_path", get_yaml_files(), ids=lambda path: path.name)
def test_validate_conformance_yaml(yaml_path):
    try:
        validate_conformance_yaml(yaml_path)
    except jsonschema.ValidationError as e:
        pytest.fail(f"{yaml_path} at {e.json_path}: {e.message}")
    except (OSError, ValueError, yaml.YAMLError) as e:
        pytest.fail(f"{yaml_path}: {e}")


def parse_case(**changes):
    return {
        "name": "schema_regression",
        "action": "parse_data",
        "features": ["F-CRAFT-TEXT-01"],
        "description": "A data file.",
        "source": "{}",
        "expect": {"data": {}},
        **changes,
    }


def without(case, key):
    return {k: v for k, v in case.items() if k != key}


def test_a_valid_case_passes():
    VALIDATOR.validate([parse_case()])


@pytest.mark.parametrize("missing", ["name", "action", "features", "description"])
def test_cases_require_their_metadata(missing):
    with pytest.raises(jsonschema.ValidationError):
        VALIDATOR.validate([without(parse_case(), missing)])


@pytest.mark.parametrize(
    "case",
    [
        parse_case(action="parse_dat"),
        parse_case(sorce="{}"),
        parse_case(features=[]),
        parse_case(features=["F-CORE-01"]),
        parse_case(features=["F-CRAFT-TEXT-1"]),
        parse_case(expect={}),
        parse_case(expect={"data": {}, "error": {}}),
        parse_case(expect={"library": {}}),
        parse_case(expect={"error": {"line": 0}}),
        parse_case(expect={"error": {"column": 1}}),
        without(parse_case(), "source"),
        parse_case(sources=["{}"]),
    ],
)
def test_invalid_cases_are_rejected(case):
    with pytest.raises(jsonschema.ValidationError):
        VALIDATOR.validate([case])


def unevaluated(errors):
    """The messages of unevaluatedProperties errors, including nested ones."""
    for error in errors:
        if error.validator == "unevaluatedProperties":
            yield error.message
        yield from unevaluated(error.context)


@pytest.mark.parametrize(
    "action", SCHEMA["$defs"]["CraftTestCase"]["properties"]["action"]["enum"]
)
def test_every_action_is_closed(action):
    case = {**parse_case(action=action), "unknown_key": True}
    assert any(
        "unknown_key" in message
        for message in unevaluated(VALIDATOR.iter_errors([case]))
    )
