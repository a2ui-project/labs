# Deploying

The whole app is one container: the Python server, the React client at `/`,
and the Flutter client at `/flutter/`. It runs on one Cloud Run service with one URL, so there is nothing to configure for
cross-origin requests.

You need a Google Cloud project with billing enabled, and the
[gcloud CLI](https://cloud.google.com/sdk/docs/install) signed in to it.
[Cloud Shell](https://shell.cloud.google.com) has the CLI already.

## In Cloud Shell, guided

[![Open in Cloud Shell](https://gstatic.com/cloudssh/images/open-btn.svg)](https://shell.cloud.google.com/cloudshell/editor?cloudshell_git_repo=https://github.com/a2ui-project/labs&cloudshell_git_branch=main&cloudshell_workspace=samples/travel-a2ui&cloudshell_tutorial=docs/cloud-shell.md&show=ide%2Cterminal)

This opens Cloud Shell with the sample cloned and a short guide beside the
terminal ([`cloud-shell.md`](cloud-shell.md)): sign in, choose a project, and
copy the commands below one at a time. It all runs as you, in your project.

## Deploy

From `samples/travel-a2ui` in a clone, turn on the services the deploy uses
and let the build use them, once per project, then deploy:

```bash
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com
PROJECT_ID=$(gcloud config get-value project)
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
gcloud projects add-iam-policy-binding "$PROJECT_ID" --condition=None \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role=roles/run.builder
gcloud run deploy travel-a2ui --source . \
  --region us-central1 --allow-unauthenticated \
  --memory 1Gi --cpu 1 --concurrency 40 --max-instances 1 --timeout 600
```

Everything before the deploy is once per project. The grant gives the project's
default Compute Engine service account the Cloud Run Builder role
(`roles/run.builder`): a source deploy builds as that account, and in projects
created since mid-2024 it starts with no roles, so without it the build fails
with `PERMISSION_DENIED ... missing required IAM permissions`. To build as an
account of your own instead, grant it that role and pass
`--build-service-account` to the deploy.

Cloud Build builds the `Dockerfile` and Cloud Run serves it. The first build
takes about ten minutes, because it builds both clients. Run the last command
again to deploy a change.

No Gemini key is set on the service. Each visitor pastes their own in the
browser, so the deployment costs you nothing to leave running. To give it a
shared key, see [A shared key](#a-shared-key).

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
