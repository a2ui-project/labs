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

import '@angular/compiler';
import {beforeAll, describe, expect, it} from 'vitest';
import {A2uiRendererService} from '@a2ui/angular';
import {createEnvironmentInjector, EnvironmentInjector} from '@angular/core';
import {TestBed} from '@angular/core/testing';
import {BrowserTestingModule, platformBrowserTesting} from '@angular/platform-browser/testing';
import * as awarenessProtocol from 'y-protocols/awareness';
import * as yjs from 'yjs';

import {provideIsolatedA2uiRenderer} from '../catalog/catalog';
import {type JsonObject, transformIndexAcrossEdit, type YDataValue} from './json_types';
import {YjsA2uiBinder} from './yjs_a2ui_binder';

function seedRoomDoc(doc: yjs.Doc): void {
  doc.transact(() => {
    const meta = doc.getMap<string | boolean>('meta');
    meta.set('surfaceId', 'test_collab_surface');
    meta.set('catalogId', 'https://a2ui.org/specification/v0_9/catalogs/basic/catalog.json');
    meta.set('title', 'Test Collab Surface');
    meta.set('sendDataModel', true);

    const components = doc.getMap<YDataValue>('components');
    const order = doc.getArray<string>('componentOrder');

    const specs: JsonObject[] = [
      {
        id: 'root',
        component: 'Column',
        children: ['shared_notes', 'my_vote', 'my_rationale', 'local_filter'],
      },
      {
        id: 'shared_notes',
        component: 'TextField',
        label: 'Shared Notes',
        value: {path: '/shared/notes'},
      },
      {
        id: 'my_vote',
        component: 'ChoicePicker',
        displayStyle: 'chips',
        variant: 'mutuallyExclusive',
        value: {path: '/me/vote'},
        options: [
          {label: 'Approve', value: 'APPROVE'},
          {label: 'Reject', value: 'REJECT'},
        ],
      },
      {
        id: 'my_rationale',
        component: 'TextField',
        label: 'Rationale',
        value: {path: '/me/rationale'},
      },
      {
        id: 'local_filter',
        component: 'ChoicePicker',
        displayStyle: 'chips',
        variant: 'mutuallyExclusive',
        value: {path: '/local/sectionFilter'},
        options: [
          {label: 'All', value: 'all'},
          {label: 'Votes', value: 'votes'},
        ],
      },
    ];

    for (const spec of specs) {
      const id = String(spec['id']);
      components.set(id, jsonObjToYMap(spec));
      order.push([id]);
    }

    const data = doc.getMap<YDataValue>('data');
    const shared = new yjs.Map<YDataValue>();
    shared.set('notes', new yjs.Text('Base spec'));
    data.set('shared', shared);

    const users = new yjs.Map<YDataValue>();
    const alice = new yjs.Map<YDataValue>();
    alice.set('vote', 'APPROVE');
    alice.set('rationale', new yjs.Text('Initial Alice note'));
    users.set('alice', alice);
    data.set('users', users);
  });
}

function jsonObjToYMap(obj: JsonObject): yjs.Map<YDataValue> {
  const m = new yjs.Map<YDataValue>();
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (
      val === null ||
      typeof val === 'string' ||
      typeof val === 'number' ||
      typeof val === 'boolean'
    ) {
      m.set(key, val);
    } else if (Array.isArray(val)) {
      const arr = new yjs.Array<YDataValue>();
      for (const item of val) {
        if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
          arr.push([jsonObjToYMap(item)]);
        } else if (
          item === null ||
          typeof item === 'string' ||
          typeof item === 'number' ||
          typeof item === 'boolean'
        ) {
          arr.push([item]);
        }
      }
      m.set(key, arr);
    } else {
      m.set(key, jsonObjToYMap(val));
    }
  }
  return m;
}

describe('YjsA2uiBinder', () => {
  beforeAll(() => {
    TestBed.initTestEnvironment(BrowserTestingModule, platformBrowserTesting());
  });

  function createRenderer(): A2uiRendererService {
    const parentEnv = TestBed.inject(EnvironmentInjector);
    const childEnv = createEnvironmentInjector(provideIsolatedA2uiRenderer(), parentEnv);
    return childEnv.get(A2uiRendererService);
  }
  it('merges concurrent TextField Y.Text edits, isolates /local/*, and aliases /me/* per user', () => {
    const rendererA = createRenderer();
    const rendererB = createRenderer();

    const docA = new yjs.Doc();
    const docB = new yjs.Doc();
    seedRoomDoc(docA);
    yjs.applyUpdate(docB, yjs.encodeStateAsUpdate(docA));

    const awarenessA = new awarenessProtocol.Awareness(docA);
    const awarenessB = new awarenessProtocol.Awareness(docB);

    const binderA = new YjsA2uiBinder({
      doc: docA,
      awareness: awarenessA,
      renderer: rendererA,
      actorId: 'alice',
      displayName: 'Alice',
    });
    const binderB = new YjsA2uiBinder({
      doc: docB,
      awareness: awarenessB,
      renderer: rendererB,
      actorId: 'bob',
      displayName: 'Bob',
    });

    const surfaceA = rendererA.surfaceGroup.getSurface('test_collab_surface')!;
    const surfaceB = rendererB.surfaceGroup.getSurface('test_collab_surface')!;
    expect(surfaceA).toBeDefined();
    expect(surfaceB).toBeDefined();

    // Concurrent disconnected edits on /shared/notes (Y.Text), /me/vote (LWW enum), and /local/sectionFilter!
    surfaceA.dataModel.set('/shared/notes', 'Base spec + Alice');
    surfaceA.dataModel.set('/me/vote', 'REJECT');
    surfaceA.dataModel.set('/local/sectionFilter', 'votes');

    surfaceB.dataModel.set('/shared/notes', 'Bob: Base spec');
    surfaceB.dataModel.set('/me/vote', 'APPROVE');

    // Exchange binary Yjs updates in both directions (simulating WebSocket convergence).
    const updateFromA = yjs.encodeStateAsUpdate(docA);
    const updateFromB = yjs.encodeStateAsUpdate(docB);
    yjs.applyUpdate(docA, updateFromB, 'remote');
    yjs.applyUpdate(docB, updateFromA, 'remote');

    // 1. Both TextField DataModels converged with BOTH Bob's prefix AND Alice's suffix!
    expect(surfaceA.dataModel.get<string>('/shared/notes')).toBe('Bob: Base spec + Alice');
    expect(surfaceB.dataModel.get<string>('/shared/notes')).toBe('Bob: Base spec + Alice');

    // 2. /me/vote remained atomic per collaborator and projected to /users/*!
    expect(surfaceA.dataModel.get<string>('/me/vote')).toBe('REJECT');
    expect(surfaceB.dataModel.get<string>('/me/vote')).toBe('APPROVE');
    expect(surfaceA.dataModel.get<string>('/users/bob/vote')).toBe('APPROVE');
    expect(surfaceB.dataModel.get<string>('/users/alice/vote')).toBe('REJECT');

    // 3. /local/sectionFilter stayed private to Alice's viewport and never leaked to Bob!
    expect(surfaceA.dataModel.get<string>('/local/sectionFilter')).toBe('votes');
    expect(surfaceB.dataModel.get<string>('/local/sectionFilter')).toBe('all');

    // 4. Awareness propagates active component focus between peers.
    binderA.setFocusedComponent('shared_notes');
    const awBytes = awarenessProtocol.encodeAwarenessUpdate(awarenessA, [docA.clientID]);
    awarenessProtocol.applyAwarenessUpdate(awarenessB, awBytes, 'remote');

    const snapB = binderB.getSnapshot();
    const alicePeer = snapB.peers.find(p => p.actorId === 'alice');
    expect(alicePeer?.focusedComponentId).toBe('shared_notes');
    expect(alicePeer?.focusedLabel).toBe('Shared Notes');

    binderA.dispose();
    binderB.dispose();
    awarenessA.destroy();
    awarenessB.destroy();
    docA.destroy();
    docB.destroy();
  });

  it('transforms mid-string UTF-16 caret offsets across remote prefix, suffix, and overlapping edits', () => {
    expect(transformIndexAcrossEdit(5, 'Hello world', 'Hello world + Bob')).toBe(5);
    expect(transformIndexAcrossEdit(5, 'Hello world', 'Bob: Hello world')).toBe(10);
    expect(transformIndexAcrossEdit(8, 'Hello beautiful world', 'Hello world')).toBe(6);
  });

  it('evaluates v1.0 formatString expressions cleanly, resolves Y.Text handles, and restores empty /local/sectionFilter', async () => {
    const renderer = createRenderer();

    const surfaceErrors: string[] = [];
    const errSub = renderer.surfaceGroup.onError.subscribe(err => {
      surfaceErrors.push(err.message || err.code);
    });

    const doc = new yjs.Doc();
    seedRoomDoc(doc);
    doc.transact(() => {
      const components = doc.getMap<YDataValue>('components');
      const order = doc.getArray<string>('componentOrder');
      components.set(
        'root',
        jsonObjToYMap({
          id: 'root',
          component: 'Column',
          children: ['shared_notes', 'my_vote', 'my_rationale', 'local_filter', 'formatted_tally'],
        }),
      );
      components.set(
        'formatted_tally',
        jsonObjToYMap({
          id: 'formatted_tally',
          component: 'Text',
          text: {
            call: 'formatString',
            args: {
              value: 'Spec: ${/shared/notes} | Alice: ${/users/alice/vote}',
            },
          },
        }),
      );
      order.push(['formatted_tally']);
    });

    const awareness = new awarenessProtocol.Awareness(doc);
    const binder = new YjsA2uiBinder({
      doc,
      awareness,
      renderer,
      actorId: 'alice',
      displayName: 'Alice',
    });

    const surface = renderer.surfaceGroup.getSurface('test_collab_surface')!;
    const formattedModel = surface.componentsModel.get('formatted_tally')!;
    expect(formattedModel.properties['text']).toBeDefined();
    expect(surfaceErrors).toEqual([]);

    expect(binder.resolveYText('/shared/notes')?.toJSON()).toBe('Base spec');
    expect(binder.resolveYText('/me/rationale')?.toJSON()).toBe('Initial Alice note');
    expect(binder.findControlAtOrder('ChoicePicker', 1)?.componentId).toBe('local_filter');

    surface.dataModel.set('/local/sectionFilter', '');
    await Promise.resolve();

    expect(surface.dataModel.get<string>('/local/sectionFilter')).toBe('all');
    expect(doc.getMap<YDataValue>('data').has('local')).toBe(false);

    errSub.unsubscribe();
    binder.dispose();
    awareness.destroy();
    doc.destroy();
  });
});
