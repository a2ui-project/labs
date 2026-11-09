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

import * as api from '@actual-app/api';
import type {Command} from 'commander';

import {withConnection} from '#connection';
import {readJsonInput} from '#input';
import {printOutput} from '#output';

export function registerRulesCommand(program: Command) {
  const rules = program.command('rules').description('Manage transaction rules');

  rules
    .command('list')
    .description('List all rules')
    .action(async () => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const result = await api.getRules();
          printOutput(result, opts.format);
        },
        {mutates: false},
      );
    });

  rules
    .command('payee-rules <payeeId>')
    .description('List rules for a specific payee')
    .action(async (payeeId: string) => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const result = await api.getPayeeRules(payeeId);
          printOutput(result, opts.format);
        },
        {mutates: false},
      );
    });

  rules
    .command('create')
    .description('Create a new rule')
    .option('--data <json>', 'Rule definition as JSON')
    .option('--file <path>', 'Read rule from JSON file (use - for stdin)')
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const rule = readJsonInput(cmdOpts) as Parameters<typeof api.createRule>[0];
          const id = await api.createRule(rule);
          printOutput({id}, opts.format);
        },
        {mutates: true},
      );
    });

  rules
    .command('update')
    .description('Update a rule')
    .option('--data <json>', 'Rule data as JSON (must include id)')
    .option('--file <path>', 'Read rule from JSON file (use - for stdin)')
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const rule = readJsonInput(cmdOpts) as Parameters<typeof api.updateRule>[0];
          await api.updateRule(rule);
          printOutput({success: true}, opts.format);
        },
        {mutates: true},
      );
    });

  rules
    .command('delete <id>')
    .description('Delete a rule')
    .action(async (id: string) => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          await api.deleteRule(id);
          printOutput({success: true, id}, opts.format);
        },
        {mutates: true},
      );
    });
}
