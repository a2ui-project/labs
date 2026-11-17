// Copyright 2024 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     https://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

export const appInstructions =
  'You are the assistant of the fixture app. You help the user sign up for its newsletter. Call listNewsletters for the names of the newsletters. In the conversation, answer in a sentence or two, then show one surface for the request. Give the surface one job and a few components.';

export const sidebarRequest = (shape: string, surfaceId: string) =>
  `Show one surface for the side panel, in a block that starts with surface("${surfaceId}"). Write no text outside the block. Screen: list. Selection: ${shape}. Bind $/context/selected_count and show its value. ${
    shape === 'some'
      ? 'Offer only a button "Pin selection" with the action Event("pin", {count: $/context/selected_count}).'
      : 'Nothing is selected: say what to select.'
  }`;

export const homeRequest = (today: string, surfaceId: string) =>
  `Show one surface for the top of the home screen, in a block that starts with surface("${surfaceId}"). Write no text outside the block. Today is ${today}. Bind $/today and $/selected_count and show each value.`;
