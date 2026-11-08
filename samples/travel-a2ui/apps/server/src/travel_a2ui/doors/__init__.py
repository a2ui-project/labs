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

"""The doors: the same brain, reachable three ways.

Each module here is one way in. They share the brain entirely — the same
skills, the same tools, the same trip record, the same surface passes — and
differ only in how a request arrives and how the answer is streamed back.

  `interactions`  the Gemini Interactions API. A typed conversation: a message
                  or a press arrives, the loop runs, A2UI streams out over SSE.
                  The reference door, and the one the web app opens by default.
  `live`          the Gemini Live API. A bidirectional audio session Google
                  drives; the traveller can speak or type, and it answers out
                  loud while drawing the same surfaces from the same catalog.
  `http`          the FastAPI app that mounts the other two, serves the built
                  clients, and answers `/api/meta` with what this deployment is.

A door owns transport and nothing else. When one of them starts wanting to know
what a trip is, that knowledge belongs in `brain` and the door should be asking
for it.
"""
