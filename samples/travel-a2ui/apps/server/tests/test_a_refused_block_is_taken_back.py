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
"""A block refused part-way does not leave half a surface behind.

A block streams: its surface is created and its first components reach the
renderer before a later component is read. When the SDK refused that later one,
the half-drawn surface stayed on screen and in the server's mirror, and the
corrected block the model wrote next was refused as "already exists". The turn
ended on half a form. Now the half-drawn surface is deleted, and the model is
told to draw it again whole.
"""

from __future__ import annotations

from typing import Any

from travel_a2ui.brain import data
from travel_a2ui.brain.ui import Canvas, Drawing

#: Valid up to its third component, which lacks a required property.
REFUSED = (
    "<a2ui>\n"
    'surface("inline-1", sendDataModel=true)\n'
    "root = Column([head, where, when])\n"
    'head = Text("### Your trip")\n'
    'where = TextField("From", $/trip/origin)\n'
    'when = AirportPicker("To", $/trip/destination)\n'
    "</a2ui>"
)

CORRECTED = (
    "<a2ui>\n"
    'surface("inline-1", sendDataModel=true)\n'
    "root = Column([head, where])\n"
    'head = Text("### Your trip")\n'
    'where = TextField("From", $/trip/origin)\n'
    "</a2ui>"
)


def _streamed(canvas: Canvas, block: str) -> list[tuple[Any, ...]]:
    """The block, fed a line at a time, as the model streams it."""
    drawing = Drawing(canvas, "inline-1", lambda _s: data.session_values({}, None))
    events = [
        event
        for line in block.splitlines(keepends=True)
        for event in drawing.feed(line)
    ]
    return [*events, *drawing.close()]


def test_the_half_drawn_surface_is_deleted_and_the_redraw_lands() -> None:
    canvas = Canvas()

    first = _streamed(canvas, REFUSED)
    sent = [m for e in first if e[0] == "ui" for m in e[2]]
    assert any("createSurface" in m for m in sent), "the surface should have streamed"
    assert any("deleteSurface" in m for m in sent), "and then been taken back"
    refusal = next(e[1] for e in first if e[0] == "rejected")
    assert 'Surface "inline-1" was removed; draw it again whole.' in refusal
    assert "inline-1" not in canvas.surfaces

    second = _streamed(canvas, CORRECTED)
    assert not [e for e in second if e[0] == "rejected"], second
    assert "inline-1" in canvas.surfaces
