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

import {createApp} from '#server/app';
import * as db from '#server/db';
import {mutator} from '#server/mutators';
import {undoable} from '#server/undo';
import type {NoteEntity} from '#types/models';

export type NotesHandlers = {
  'notes-save': typeof updateNotes;
  'notes-save-undoable': typeof updateNotes;
  'notes-get': (arg: Pick<NoteEntity, 'id'>) => Promise<NoteEntity | null>;
};

export const app = createApp<NotesHandlers>();
app.method('notes-save', updateNotes);
app.method('notes-save-undoable', mutator(undoable(updateNotes)));
app.method('notes-get', getNote);

async function updateNotes({id, note}: NoteEntity) {
  await db.update('notes', {id, note});
}

async function getNote({id}: Pick<NoteEntity, 'id'>): Promise<NoteEntity | null> {
  return db.first<NoteEntity>('SELECT id, note FROM notes WHERE id = ?', [id]);
}
