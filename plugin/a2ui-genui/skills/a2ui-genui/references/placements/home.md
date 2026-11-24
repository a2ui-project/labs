# Placement: home

## Use

- Take `home` for a flow whose trigger is `context`: the user opens the
  app. The surface arranges the data that matters on this date.
- The container is a region at the top of the app's first screen. The rest
  of the screen stays below it. The region's normal content is what the app
  showed at that place before, often nothing. Give the region no fixed
  height: it grows with its surface.
- If the first screen has no place for a region, take a second flow of a
  placement that exists, and say why in the proposal.
- Mount the surface in the container as the stack's Mount heading says.

## Request

The host starts one generation for each app session, and one more when the
date changes. The context key is the date. The host builds the user turn
from this brief, with a new surface id for each generation:

```text
Show one surface for the top of the home screen, in a block that starts
with surface("<surface id>"). Write no text outside the block. Today is
<date>. Bind <each data root> and show each value. Lead with what matters
most on this date, then what needs a decision. If there is no data, show
one short line and one action.
```

## Surface

Standing slot. The host writes the date to `$/today`, and the data that the
region shows into its own roots. A press goes to the action handler of the
session, and a follow-up request uses the turn history of the region.

## States

- No key: the container shows its normal content and one control
  that opens the key entry in the app's settings.
- Busy: its normal content shows until the surface is complete, and the
  busy signal shows.
- Error: the old content stays, and one retry control shows.
- No data: the surface shows one short line and one action.

## Test

Set a fixed clock, and find the container as the Mount heading says. Open
the first screen, wait for the request and then until the busy signal
ends, and add these cases:

1. A remount of the container makes no second request.
2. The request holds the date of the fixed clock.
3. A data change reaches the surface with no request.
4. A change of the date makes exactly one new request.
