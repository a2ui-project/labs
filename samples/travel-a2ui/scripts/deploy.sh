#!/usr/bin/env bash
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

#
# Deploys Travel A2UI to Cloud Run in your Google Cloud project: the server and
# both clients, on one URL.
#
#   ./scripts/deploy.sh                 the project gcloud is set to
#   ./scripts/deploy.sh PROJECT_ID      another project
#
# Needs the gcloud CLI, signed in (Cloud Shell has it), and a project with
# billing enabled. Set REGION or SERVICE to change where it goes and what it is
# called. Safe to run again: each step is a no-op once done, and the deploy
# ships whatever changed.
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

project="${1:-$(gcloud config get-value project 2>/dev/null || true)}"
region="${REGION:-us-central1}"
service="${SERVICE:-travel-a2ui}"

step() { printf '\n→ %s\n' "$1"; }

if [[ -z "$project" ]]; then
  echo "No project. Run: ./scripts/deploy.sh YOUR_PROJECT_ID" >&2
  exit 2
fi
if [[ -z "$(gcloud auth list --filter=status:ACTIVE --format='value(account)' 2>/dev/null)" ]]; then
  echo "gcloud is not signed in. Run: gcloud auth login" >&2
  exit 2
fi
gcloud config set project "$project" --quiet >/dev/null

step "Turning on Cloud Run, Cloud Build and Artifact Registry in $project"
gcloud services enable run.googleapis.com cloudbuild.googleapis.com \
  artifactregistry.googleapis.com

# A source deploy builds as the project's default Compute Engine service
# account. In projects created since mid-2024 that account starts with no
# roles, and the build fails with "PERMISSION_DENIED ... missing required IAM
# permissions" when it reads the source it was just given.
step "Letting the build read its source and push its image"
number="$(gcloud projects describe "$project" --format='value(projectNumber)')"
gcloud projects add-iam-policy-binding "$project" --condition=None --quiet \
  --member="serviceAccount:${number}-compute@developer.gserviceaccount.com" \
  --role=roles/run.builder >/dev/null

# --max-instances 1: conversations live in the server's memory, so a second
# instance would not know them. --timeout 600: a turn is a streamed response
# held open while the model answers.
step "Building and deploying (about ten minutes the first time)"
gcloud run deploy "$service" --source . --region "$region" --quiet \
  --allow-unauthenticated --memory 1Gi --cpu 1 --concurrency 40 \
  --max-instances 1 --timeout 600

url="$(gcloud run services describe "$service" --region "$region" --format='value(status.url)')"
step "Deployed"
echo "  React:   $url"
echo "  Flutter: $url/flutter/"
echo "  Each visitor pastes their own Gemini key; none is stored on the service."
