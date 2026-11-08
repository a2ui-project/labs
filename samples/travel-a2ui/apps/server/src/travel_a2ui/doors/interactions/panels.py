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

"""The panel, asked for once.

The sidebar is drawn by the model like every other surface. It binds `/panel`,
which the host keeps current, so after the first draw every decision reaches it
as data. This asks for that first draw when a turn ends with a trip to show and
no panel on screen: one model call, after the traveller's answer is complete,
on `PANEL_MODEL` (the conversation's model unless set otherwise).
"""

from __future__ import annotations

from typing import Any, AsyncIterator, Callable

from ...brain.skills import build_system_prompt
from ...brain.ui import Canvas, Drawing
from ...gemini import stream_interaction, supported_level
from ..settings import DEFAULT_MODEL, PANEL_EFFORT, PANEL_MODEL, PANEL_REQUEST


async def draw_panel(
    api_key: str,
    client: Any,
    canvas: Canvas,
    trip: dict[str, Any],
    today: str,
    values: Callable[[str], dict[str, Any]],
) -> AsyncIterator[dict[str, Any]]:
    """Asks the model for the sidebar, and sends what it draws.

    A failure is silent: the answer has already landed, and a panel missing
    for one more turn is better than an error over a conversation that went
    fine. The next turn asks again.
    """
    system = build_system_prompt(
        surface="sidebar",
        surface_id="sidebar",
        trip=trip,
        today=today,
        on_screen=canvas.surfaces,
    )
    drawing = Drawing(canvas, "sidebar", values, creatable={"sidebar"})
    collected: list[dict[str, Any]] = []
    try:
        async for event in stream_interaction(
            api_key=api_key,
            model=PANEL_MODEL,
            input=[{
                "type": "user_input",
                "content": [{"type": "text", "text": PANEL_REQUEST}],
            }],
            system_instruction=system,
            thinking_level=supported_level(PANEL_MODEL, PANEL_EFFORT),
            fallback_model=DEFAULT_MODEL,
            client=client,
        ):
            if event["type"] == "text":
                collected.extend(drawing.feed(event["delta"]))
        collected.extend(drawing.close())
    except Exception:  # noqa: BLE001 - a missing panel beats an error banner
        collected.extend(drawing.close())

    for event in collected:
        if event[0] == "ui":
            yield {
                "type": "ui",
                "surfaceId": event[1],
                "messages": event[2],
                "done": True,
            }
