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
import {printOutput} from '#output';

export function registerPayeesCommand(program: Command) {
  const payees = program.command('payees').description('Manage payees');

  payees
    .command('list')
    .description('List all payees')
    .action(async () => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const result = await api.getPayees();
          printOutput(result, opts.format);
        },
        {mutates: false},
      );
    });

  payees
    .command('common')
    .description('List frequently used payees')
    .action(async () => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const result = await api.getCommonPayees();
          printOutput(result, opts.format);
        },
        {mutates: false},
      );
    });

  payees
    .command('create')
    .description('Create a new payee')
    .requiredOption('--name <name>', 'Payee name')
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const id = await api.createPayee({name: cmdOpts.name});
          printOutput({id}, opts.format);
        },
        {mutates: true},
      );
    });

  payees
    .command('update <id>')
    .description('Update a payee')
    .option('--name <name>', 'New payee name')
    .action(async (id: string, cmdOpts) => {
      const fields: Record<string, unknown> = {};
      if (cmdOpts.name) fields.name = cmdOpts.name;
      if (Object.keys(fields).length === 0) {
        throw new Error('No fields to update. Use --name to specify a new name.');
      }
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          await api.updatePayee(id, fields);
          printOutput({success: true, id}, opts.format);
        },
        {mutates: true},
      );
    });

  payees
    .command('delete <id>')
    .description('Delete a payee')
    .action(async (id: string) => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          await api.deletePayee(id);
          printOutput({success: true, id}, opts.format);
        },
        {mutates: true},
      );
    });

  payees
    .command('merge')
    .description('Merge payees into a target payee')
    .requiredOption('--target <id>', 'Target payee ID')
    .requiredOption('--ids <ids>', 'Comma-separated payee IDs to merge')
    .action(async (cmdOpts: {target: string; ids: string}) => {
      const mergeIds = cmdOpts.ids
        .split(',')
        .map(id => id.trim())
        .filter(id => id.length > 0);
      if (mergeIds.length === 0) {
        throw new Error('No valid payee IDs provided in --ids. Provide comma-separated IDs.');
      }
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          await api.mergePayees(cmdOpts.target, mergeIds);
          printOutput({success: true}, opts.format);
        },
        {mutates: true},
      );
    });
}
