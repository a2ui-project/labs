# Deploy Travel A2UI to Cloud Run

<walkthrough-tutorial-duration duration="15"></walkthrough-tutorial-duration>

This deploys the sample to Cloud Run in your own Google Cloud project: the
Python server and both clients, on one URL. It runs in this terminal, as you,
in the project you choose.

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

## Deploy

From this folder, `samples/travel-a2ui`:

```sh
./scripts/deploy.sh
```

It turns on Cloud Run, Cloud Build and Artifact Registry, lets the build use
them (a project created since mid-2024 needs this, or the build fails with
`PERMISSION_DENIED`), then builds and deploys. The first build takes about ten
minutes, because it builds both clients. Run it again to deploy a change.

## Open it

The script ends with the URL. Open it, paste a Gemini API key from
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
