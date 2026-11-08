/*
 * Copyright 2024 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * One surface on screen, drawn by `@a2ui/react`.
 *
 * Subscribes only to whether the surface exists; what is inside it is the
 * SDK's to keep current, and it updates exactly the components a message
 * touched. Markdown is supplied here because A2UI 1.0's `Text` is Markdown —
 * a heading is `### Outbound` — and the SDK renders it with what the app gives.
 */

import {useSyncExternalStore} from 'react';
import {A2uiSurface, MarkdownContext} from '@a2ui/react';
import {renderMarkdown} from '@travel-a2ui/renderer';

import type {Surfaces} from '../surfaces.js';

export function useSurfaces(surfaces: Surfaces): number {
  return useSyncExternalStore(surfaces.subscribe, surfaces.getVersion, surfaces.getVersion);
}

/**
 * `interactive={false}` makes the whole surface inert: an answered card is a
 * record of the answer, and `inert` stops clicks and focus for everything in
 * it — the SDK's own web components included — with nothing to re-implement.
 */
export function SurfaceView({
  surfaces,
  surfaceId,
  interactive = true,
}: {
  surfaces: Surfaces;
  surfaceId: string;
  interactive?: boolean;
}) {
  useSurfaces(surfaces);
  const surface = surfaces.get(surfaceId);
  if (!surface) return null;
  return (
    <MarkdownContext.Provider value={renderMarkdown}>
      <div className="a2-surface" data-surface={surfaceId} inert={!interactive}>
        <A2uiSurface surface={surface} />
      </div>
    </MarkdownContext.Provider>
  );
}
