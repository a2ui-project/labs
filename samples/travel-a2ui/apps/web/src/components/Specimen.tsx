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
 * One component, on its own, at `/catalog/<Name>`.
 *
 * What the component reference (`docs/catalog.md`) photographs, and a link
 * anyone can share to a single component, drawn from the same build-time
 * reference and the same SDK renderer as everything else.
 */

import {useMemo} from 'react';

import reference from '../generated/catalog-reference.json';
import {Surfaces} from '../surfaces.js';
import {SurfaceView} from './SurfaceView.js';

export function Specimen({name}: {name: string}) {
  const component = (
    reference.components as Array<{name: string; messages?: unknown[]; error?: string}>
  ).find(entry => entry.name === name);
  const surfaces = useMemo(() => {
    if (!component?.messages) return null;
    const one = new Surfaces();
    one.apply(component.messages);
    return one;
  }, [component]);
  const surfaceId = surfaces?.ids()[0];

  return (
    <main className="specimen">
      {surfaces && surfaceId ? (
        <div className="specimen__surface" data-component={name}>
          <SurfaceView surfaces={surfaces} surfaceId={surfaceId} />
        </div>
      ) : (
        <p className="specimen__missing">{component?.error ?? `No component called ${name}.`}</p>
      )}
    </main>
  );
}
