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

"""Turns that say what they are about to do, and then end.

A model told not to answer "Let me find some flights for you" with nothing
drawn still does it, in both doors, often enough that it is not a wording
problem. So both doors hand such a turn back once, with what it actually did.
The check lives in the brain so the two doors share it rather than one
importing the other.
"""

from __future__ import annotations

import re

#: Saying you are about to do the thing, instead of doing it.
#:
#: Deliberately narrow. This only decides whether a turn that produced *nothing*
#: gets handed back once, so a false positive costs one extra round and a false
#: negative costs nothing that is not already broken. What it must not do is
#: fire on an ordinary answer — "there are four nonstops" is a turn that did its
#: job, and re-prodding it would talk over the traveller.
PROMISE = re.compile(
    r"\b("
    # "let me know" is an invitation, not a promise to act — and it is how a
    # perfectly good turn ends. Excluding it is not a nicety: a false positive
    # here fires a retry over a turn that already did its job.
    r"let me\b(?!\s+know)|let'?s\s+(set|get|start|find|look|pick|sort)|"
    r"i'?ll\s+(find|look|check|pull|search|get|see|set|map|record|put)|"
    r"i'?m\s+(going to|about to|looking|finding|checking|searching|pulling)|"
    r"one (moment|second)|just a (moment|second)|hold on|"
    r"give me a (moment|second)|searching now|looking (that )?up"
    r")",
    re.IGNORECASE,
)


def promised(said: str) -> bool:
    """True when the turn announced an intention rather than acting on one."""
    return bool(said.strip()) and bool(PROMISE.search(said))


#: Handed back to a spoken turn that promised and called nothing.
#:
#: Phrased as the traveller, because that is the only role that channel has to
#: speak in — and phrased as a fact about the screen rather than a scolding,
#: since what needs to change is the next action, not the model's feelings about
#: the last one.
SPOKEN_NUDGE = (
    "[system] You said you would look, and then called nothing — the screen in "
    "front of me has not changed. Do it now in this turn: call the lookup, then "
    "the tool that draws the result, then say one short sentence about what is "
    "on screen. Do not say you are about to; there is no turn after this one to "
    "do it in."
)

#: Handed back to a typed turn that promised and drew nothing.
#:
#: Names the controls, because the turn this fires on is almost always the
#: opening one — somebody said where they want to go, and what is missing is the
#: dates and the party.
TYPED_NUDGE = (
    "You said what you were about to do and then did not do it: no tool ran and "
    "nothing was drawn, so the traveler is looking at a sentence and an empty "
    "space.\n\n"
    "Do it now, in this turn. If values are missing, draw the controls for them "
    "in one surface — a DateRangePicker for the dates, one TravelerCounter per "
    "hop labelled by hop, an AirportPicker for any airport you cannot place — with "
    "a single commit button binding every path it edits. If a lookup is what is "
    "needed, call it and draw the result.\n\n"
    "Only the <a2ui> block. Do not repeat the sentence, and do not write another "
    "one saying you are about to."
)


#: Components that only say something: text, and what arranges it.
#:
#: A surface made of nothing else cannot be answered and shows no data, which is
#: right for a heading and wrong for a turn's whole answer.
SAYING_ONLY = frozenset({"Text", "Column", "Row", "Card", "Divider", "Icon", "Image"})


def only_says(components: list[dict]) -> bool:
    """True when something was drawn and none of it shows data or takes input."""
    return bool(components) and all(
        component.get("component") in SAYING_ONLY for component in components
    )


def placeholder_nudge(surfaces: list[str]) -> str:
    """Handed back to a typed turn that drew a card about work it never started.

    The card in front of the traveller says flights are being searched; nothing
    is searching, and the turn has ended, so the card stays like that. Measured:
    "Let me pull the New York to San Francisco flights", then a card reading
    "Searching flights for 3 travelers...", and no tool call. A check for turns
    that drew *nothing* let it through, because something was drawn.
    """
    named = ", ".join(f'"{surface}"' for surface in surfaces) or "it"
    return (
        "You drew a card about work you have not started: no tool ran, so the "
        f"card ({named}) says something is happening and nothing is.\n\n"
        "Do it now, in this turn. Call the lookup it describes, then draw the "
        "result into the same surface with update=true, replacing what you "
        "wrote there. If values are missing for that lookup, draw the controls "
        "for them instead, as the brief says.\n\n"
        "Only the <a2ui> block. Do not repeat the sentence."
    )


#: Saying something is on the screen.
#:
#: The voice door's other way to talk past the screen: "here are your flights",
#: "I've put the options up for you", with nothing drawn this turn. Checked only
#: against a turn that drew nothing, so an ordinary "here is the total" after a
#: real surface is never questioned.
CLAIM = re.compile(
    r"\b("
    r"on (your|the) screen|here (are|is)\b|"
    r"i'?ve (put|drawn|pulled|shown|laid|set|added|listed|brought)|"
    r"take a look|you(?:'ll| will| can) see|"
    r"(see|find) (them|it|those|these) (below|above|there)"
    r")",
    re.IGNORECASE,
)


def claimed(said: str) -> bool:
    """True when the turn told the traveller something is on their screen."""
    return bool(said.strip()) and bool(CLAIM.search(said))


#: Handed back to a spoken turn that said it showed something and did not.
#:
#: Measured: the voice model said it had drawn the options when no render call
#: had been made, or after a search whose rows no surface on screen shows.
SHOWN_NUDGE = (
    "[system] Nothing new was drawn this turn, so what you described is not on "
    "the screen in front of me. Draw it now in this turn: call render_a2ui_express "
    "with the surface for it, then say one short sentence about what is on "
    "screen."
)
