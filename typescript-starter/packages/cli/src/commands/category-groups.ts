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
import {parseBoolFlag} from '#utils';

export function registerCategoryGroupsCommand(program: Command) {
  const groups = program.command('category-groups').description('Manage category groups');

  groups
    .command('list')
    .description('List category groups (excludes hidden by default)')
    .option('--include-hidden', 'Include hidden groups and categories', false)
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const result = await api.getCategoryGroups(cmdOpts.includeHidden ? {} : {hidden: false});
          printOutput(result, opts.format);
        },
        {mutates: false},
      );
    });

  groups
    .command('create')
    .description('Create a new category group')
    .requiredOption('--name <name>', 'Group name')
    .option('--is-income', 'Mark as income group', false)
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const id = await api.createCategoryGroup({
            name: cmdOpts.name,
            is_income: cmdOpts.isIncome,
            hidden: false,
          });
          printOutput({id}, opts.format);
        },
        {mutates: true},
      );
    });

  groups
    .command('update <id>')
    .description('Update a category group')
    .option('--name <name>', 'New group name')
    .option('--hidden <bool>', 'Set hidden status')
    .action(async (id: string, cmdOpts) => {
      const fields: Record<string, unknown> = {};
      if (cmdOpts.name !== undefined) fields.name = cmdOpts.name;
      if (cmdOpts.hidden !== undefined) {
        fields.hidden = parseBoolFlag(cmdOpts.hidden, '--hidden');
      }
      if (Object.keys(fields).length === 0) {
        throw new Error('No update fields provided. Use --name or --hidden.');
      }
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          await api.updateCategoryGroup(id, fields);
          printOutput({success: true, id}, opts.format);
        },
        {mutates: true},
      );
    });

  groups
    .command('delete <id>')
    .description('Delete a category group')
    .option('--transfer-to <id>', 'Transfer transactions to this category ID')
    .action(async (id: string, cmdOpts) => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          await api.deleteCategoryGroup(id, cmdOpts.transferTo);
          printOutput({success: true, id}, opts.format);
        },
        {mutates: true},
      );
    });
}
