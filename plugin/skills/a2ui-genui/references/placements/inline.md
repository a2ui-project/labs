# Placement: inline

## Use

- Take `inline` for a flow with a `prompt` trigger: the user asks in words.
- The container is a conversation view. If the app has a chat, search or
  command entry, use it. Else add a conversation view on the app's own
  route, panel, dialog or drawer, not on a new overlay.
- Only this placement can add a new view. Add a conversation only if a flow
  has a `prompt` trigger.
- Mount the surface in the container as the stack's Mount heading says.

## Request

A send of the typed text starts one generation. The user turn is that
text, after the turn history of the conversation. Put this brief in the
app's instructions:

```text
In the conversation, answer in a sentence or two, then show one surface
for the request. Give the surface one job and a few components.
```

## Surface

Per request: each answer gets its own new surface under its text, and
earlier surfaces stay. The host keeps no data root current. A press goes to
the action handler of the session, and the answer updates that surface.

## States

- No key: the conversation shows one control that opens the key entry in
  the app's settings, and the send control is off.
- Busy: the busy signal shows, and the send control is off.
- Error: an error entry shows in the conversation, in the order of the
  answer.
- No data: the read tool returns an empty result, and the model says so.

## Test

Find the container as the Mount heading says. Type the trigger's text,
send it, wait until the busy signal ends, and add these cases:

1. Two answers in one conversation each end with their own surface, also
   when the model names no surface id.
2. If the core test runs here, its case 4 also asserts the order: the text
   before the rejected block, the error entry, then the text and the block
   after it.
