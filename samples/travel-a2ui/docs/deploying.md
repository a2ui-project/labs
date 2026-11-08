# Deploying

The whole app is one container: the Python server, the React client at `/`,
and the Flutter client at `/flutter/`. It runs on one Cloud Run service with one URL, so there is nothing to configure for
cross-origin requests.

There are two ways to deploy it:

|                                 | What you do                      | Good for                                   |
| ------------------------------- | -------------------------------- | ------------------------------------------ |
| **[One click](#one-click)**     | Press the button, pick a project | Trying it in your own Google Cloud project |
| **[One command](#one-command)** | `gcloud run deploy --source .`   | Deploying your own changes by hand         |

You need a Google Cloud project with billing enabled for either.

## One click

[![Run on Google Cloud](https://deploy.cloud.run/button.svg)](https://deploy.cloud.run/?git_repo=https://github.com/a2ui-project/labs&dir=samples/travel-a2ui)

The button opens Cloud Shell, clones A2UI Labs, builds this sample's `Dockerfile`
and deploys it. It asks for a project and a region and nothing else. The
first build takes about ten minutes, because it builds both clients. The
settings come from [`app.json`](../app.json).

No Gemini key is set on the service. Each visitor pastes their own in the
browser, so the deployment costs you nothing to leave running. To give it a
shared key, see [A shared key](#a-shared-key).

## One command

From `samples/travel-a2ui` in a clone, with the [gcloud CLI](https://cloud.google.com/sdk/docs/install)
signed in:

```bash
gcloud run deploy travel-a2ui --source . \
  --region us-central1 --allow-unauthenticated \
  --memory 1Gi --cpu 1 --concurrency 40 --max-instances 1 --timeout 600
```

Cloud Build builds the `Dockerfile` and Cloud Run serves it. Run it again to
deploy a change.

## Settings worth knowing

**`--max-instances 1` keeps the app correct.** Conversations live in the
server's memory, so a second instance would not know them. To run more,
move `SessionStore` (`apps/server/src/travel_a2ui/sessions.py`) to Firestore,
Redis or Cloud SQL first.

**`--timeout 600`.** A turn is a streamed response held open while the model
answers; the 5-minute default can cut a slow one off.

### A shared key

```bash
gcloud run services update travel-a2ui --region us-central1 \
  --update-env-vars GEMINI_API_KEY=...
```

The app then stops asking visitors for a key, and every visitor's turn is on
your account. The server limits what it does with the key
(`apps/server/src/travel_a2ui/doors/guard.py`): only the models and effort it
offers, the voice socket only from its own site or `ALLOWED_ORIGINS`, and
`SHARED_KEY_TURNS_PER_HOUR` turns per address (default 60). That is a brake,
not access control. A deployment that must not be public belongs behind
[IAP](https://cloud.google.com/iap/docs/enabling-cloud-run), with a quota on
the key in Google AI Studio.

`GOOGLE_MAPS_API_KEY` is handed to the page, because the browser loads the
Maps library. Restrict it by HTTP referrer.

## After a deploy

```bash
curl -fsS https://<url>/api/healthz          # the process is up
curl -fsS https://<url>/api/meta | jq .      # the catalog and skills loaded
```

Then open the URL and the `/flutter/` page: only a surface on screen says the
app works.
