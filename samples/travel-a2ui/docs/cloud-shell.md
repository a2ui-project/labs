# Deploy Travel A2UI to Cloud Run

<walkthrough-tutorial-duration duration="15"></walkthrough-tutorial-duration>

This deploys the sample to Cloud Run in your own Google Cloud project: the
Python server and both clients, on one URL. Each step runs in this terminal,
as you, in the project you choose.

**Time to complete**: about 15 minutes, most of it the first build.

**Prerequisites**: a Google Cloud project with billing enabled.

## Sign in and choose a project

Sign in, if this terminal asks you to:

```sh
gcloud auth login
```

Then choose the project to deploy to. Replace `YOUR_PROJECT_ID` with its ID:

```sh
gcloud config set project YOUR_PROJECT_ID
```

## Turn on the services the deploy uses

Once per project:

```sh
gcloud services enable run.googleapis.com cloudbuild.googleapis.com artifactregistry.googleapis.com
```

## Deploy

From this folder, `samples/travel-a2ui`:

```sh
gcloud run deploy travel-a2ui --source . --region us-central1 --allow-unauthenticated --memory 1Gi --cpu 1 --concurrency 40 --max-instances 1 --timeout 600
```

Cloud Build builds the `Dockerfile` and Cloud Run serves it. The first build
takes about ten minutes, because it builds both clients. If it asks to create
an Artifact Registry repository, answer yes.

**Tip:** keep `--max-instances 1`. Conversations live in the server's memory,
so a second instance would not know them.

## Open it

The deploy prints the service URL. Open it, paste a Gemini API key from
[Google AI Studio](https://aistudio.google.com/apikey) when the app asks, and
the Flutter client is at the same URL with `/flutter/` on the end.

No key is stored on the service: each visitor pastes their own, so it costs you
nothing to leave running. To give it a shared key, see `docs/deploying.md`.

## Conclusion

<walkthrough-conclusion-trophy></walkthrough-conclusion-trophy>

Travel A2UI is running in your project. To remove it when you are done:

```sh
gcloud run services delete travel-a2ui --region us-central1
```
