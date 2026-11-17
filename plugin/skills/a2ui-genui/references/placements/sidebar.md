# Placement: sidebar

## Use

- Take `sidebar` for a flow with a `context` trigger on a screen with a
  list or a record, such as "Select two entries".
- The container is the app's side panel, details pane or drawer of that
  screen. On a narrow layout, it is a sheet that opens from that screen.
- If the screen has no such container, take a second flow of a placement
  that exists, and say why in the proposal.
- Mount the surface in the container as the stack's Mount heading says.

## Request

The host starts one generation when the container first shows, and one
when the context key changes. The context key is the screen and the shape
of the selection, for example `none` or `some`. The host builds the user
turn from this brief, with a new surface id for each generation:

```text
Show one surface for the side panel, in a block that starts with
surface("<surface id>"). Write no text outside the block. Screen: <screen>.
Selection: <none or some>. Bind <each data root> and show each value. Offer
only the controls for this task. If nothing is selected, say what to select.
```

## Surface

Standing slot. The host writes the selection and the screen data that the
controls need into `$/context` of the surface. A press goes to the action
handler of the session, and a follow-up request uses the turn history of
the panel.

## States

- No key: the container shows the app's normal content and one control
  that opens the key entry in the app's settings.
- Busy: the old content stays, and the busy signal shows.
- Error: the old content stays, and one retry control shows.
- No data: with no selection, the key is `none`.

## Test

Find the container as the Mount heading says. Do the trigger's steps, open
the container, wait for the request and then until the busy signal ends,
and add these cases:

1. A remount of the container makes no second request.
2. A change inside the context key reaches the surface with no request.
3. A new context key makes exactly one new request, and the old surface is
   gone.
