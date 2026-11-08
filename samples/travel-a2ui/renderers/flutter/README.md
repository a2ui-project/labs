# The Flutter renderer

The travel catalog for [`a2ui_flutter`](https://pub.dev/packages/a2ui_flutter):
what the Flutter client draws, and nothing else. It is the Flutter counterpart of
[`renderers/react/`](../react/), and the app that uses it is
[`apps/flutter/`](../../apps/flutter/).

| File                  | What it is                                                                                                  |
| --------------------- | ----------------------------------------------------------------------------------------------------------- |
| `lib/catalog.dart`    | the catalog document from `/api/catalog`, read by `Catalog.fromJson`, with an implementation for each entry |
| `lib/components.dart` | the travel views as `a2ui_flutter` `ComponentImplementation`s                                               |
| `lib/functions.dart`  | the two travel functions, `calcNights` and `equals`                                                         |
| `lib/surface.dart`    | `TravelSurface`: the SDK's `A2uiSurface`, with the Markdown in the basic `Text` rendered                    |

It holds no app logic: no network calls, no conversation, no idea what a trip
is beyond how to draw one.

## Tests

```bash
flutter test
```

`test/render_test.dart` draws every component's reference example through the
SDK, and a flight list the server's own pipeline produced. Those inputs are
generated, never written by hand:

- `test/fixtures/flights.json` by `python3 scripts/build_fixtures.py`
- `test/fixtures/examples.json` by `python3 renderers/flutter/tool/build_example_fixtures.py`

Both run from `samples/travel-a2ui`, and `npm run check` fails if either is
stale.
