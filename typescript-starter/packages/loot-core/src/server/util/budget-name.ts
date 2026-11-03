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

import { v4 as uuidv4 } from 'uuid';

import * as fs from '#platform/server/fs';
import { handlers } from '#server/main';

export async function uniqueBudgetName(
  initialName: string = 'My Finances',
): Promise<string> {
  const budgets = await handlers['get-budgets']();
  let idx = 1;

  // If there is a conflict, keep appending an index until there is no
  // conflict and we have a unique name
  let newName = initialName;
  while (budgets.find(file => file.name === newName)) {
    newName = `${initialName} ${idx}`;
    idx++;
  }

  return newName;
}

export async function validateBudgetName(
  name: string,
): Promise<{ valid: boolean; message?: string }> {
  const trimmedName = name.trim();
  const uniqueName = await uniqueBudgetName(trimmedName);
  let message: string | null = null;

  if (trimmedName === '') message = 'Budget name cannot be blank';
  if (trimmedName.length > 100) {
    message = 'Budget name is too long (max length 100)';
  }
  if (uniqueName !== trimmedName) {
    message = `"${name}" already exists, try "${uniqueName}" instead`;
  }

  return message ? { valid: false, message } : { valid: true };
}

export async function idFromBudgetName(name: string): Promise<string> {
  let id = name.replace(/( |[^A-Za-z0-9])/g, '-') + '-' + uuidv4().slice(0, 7);

  // Make sure the id is unique. There's a chance one could already
  // exist (although very unlikely now that we append unique
  // characters onto the id)
  let index = 0;

  let budgetDir = fs.getBudgetDir(id);
  while (await fs.exists(budgetDir)) {
    index++;
    budgetDir = fs.getBudgetDir(id + index.toString());
  }

  // If a suffix was added, update the id
  if (index > 0) {
    id = id + index.toString();
  }

  return id;
}
