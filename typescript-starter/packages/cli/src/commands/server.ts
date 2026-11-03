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
import { Option } from 'commander';
import type { Command } from 'commander';

import { withConnection } from '#connection';
import { printOutput } from '#output';

export function registerServerCommand(program: Command) {
  const server = program.command('server').description('Server utilities');

  server
    .command('version')
    .description('Get server version')
    .action(async () => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const version = await api.getServerVersion();
          printOutput({ version }, opts.format);
        },
        { mutates: false, skipBudget: true },
      );
    });

  server
    .command('get-id')
    .description('Get entity ID by name')
    .addOption(
      new Option('--type <type>', 'Entity type')
        .choices(['accounts', 'categories', 'payees', 'schedules'])
        .makeOptionMandatory(),
    )
    .requiredOption('--name <name>', 'Entity name')
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const id = await api.getIDByName(cmdOpts.type, cmdOpts.name);
          printOutput(
            { id, type: cmdOpts.type, name: cmdOpts.name },
            opts.format,
          );
        },
        { mutates: false },
      );
    });

  server
    .command('bank-sync')
    .description('Run bank synchronization')
    .option('--account <id>', 'Specific account ID to sync')
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const args = cmdOpts.account
            ? { accountId: cmdOpts.account }
            : undefined;
          await api.runBankSync(args);
          printOutput({ success: true }, opts.format);
        },
        { mutates: true },
      );
    });
}
