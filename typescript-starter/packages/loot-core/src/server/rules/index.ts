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

import { Action } from './action';
import { Condition } from './condition';
import { registerHandlebarsHelpers } from './handlebars-helpers';
import { execActions, Rule } from './rule';
import { RuleIndexer } from './rule-indexer';
import {
  iterateIds,
  migrateIds,
  parseDateString,
  rankRules,
} from './rule-utils';

// Ensure helpers are registered
registerHandlebarsHelpers();

// Re-export all the main classes and functions
export { parseDateString };
export { Condition };
export { Action };
export { Rule, execActions };
export { RuleIndexer };
export { rankRules, migrateIds, iterateIds };
