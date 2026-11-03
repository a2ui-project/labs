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
import type { Command } from 'commander';

import { withConnection } from '#connection';
import { printOutput } from '#output';
import { parseBoolFlag, parseIntFlag } from '#utils';

export function registerBudgetsCommand(program: Command) {
  const budgets = program.command('budgets').description('Manage budgets');

  budgets
    .command('list')
    .description('List all available budgets')
    .action(async () => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const result = await api.getBudgets();
          printOutput(result, opts.format);
        },
        { mutates: false, skipBudget: true },
      );
    });

  budgets
    .command('download <syncId>')
    .description('Download a budget by sync ID')
    .option('--encryption-password <password>', 'Encryption password')
    .action(async (syncId: string, cmdOpts) => {
      const opts = program.opts();
      await withConnection(
        opts,
        async config => {
          const password =
            cmdOpts.encryptionPassword ?? config.encryptionPassword;
          await api.downloadBudget(syncId, {
            password,
          });
          printOutput({ success: true, syncId }, opts.format);
        },
        { mutates: false, skipBudget: true },
      );
    });

  budgets
    .command('months')
    .description('List available budget months')
    .action(async () => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const result = await api.getBudgetMonths();
          printOutput(result, opts.format);
        },
        { mutates: false },
      );
    });

  budgets
    .command('month <month>')
    .description('Get budget data for a specific month (YYYY-MM)')
    .action(async (month: string) => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          const result = await api.getBudgetMonth(month);
          printOutput(result, opts.format);
        },
        { mutates: false },
      );
    });

  budgets
    .command('set-amount')
    .description('Set budget amount for a category in a month')
    .requiredOption('--month <month>', 'Budget month (YYYY-MM)')
    .requiredOption('--category <id>', 'Category ID')
    .requiredOption(
      '--amount <amount>',
      'Amount in cents (e.g. 50000 = 500.00)',
    )
    .action(async cmdOpts => {
      const amount = parseIntFlag(cmdOpts.amount, '--amount');
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          await api.setBudgetAmount(cmdOpts.month, cmdOpts.category, amount);
          printOutput({ success: true }, opts.format);
        },
        { mutates: true },
      );
    });

  budgets
    .command('set-carryover')
    .description('Enable/disable carryover for a category')
    .requiredOption('--month <month>', 'Budget month (YYYY-MM)')
    .requiredOption('--category <id>', 'Category ID')
    .requiredOption('--flag <bool>', 'Enable (true) or disable (false)')
    .action(async cmdOpts => {
      const flag = parseBoolFlag(cmdOpts.flag, '--flag');
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          await api.setBudgetCarryover(cmdOpts.month, cmdOpts.category, flag);
          printOutput({ success: true }, opts.format);
        },
        { mutates: true },
      );
    });

  budgets
    .command('hold-next-month')
    .description('Hold budget amount for next month')
    .requiredOption('--month <month>', 'Budget month (YYYY-MM)')
    .requiredOption(
      '--amount <amount>',
      'Amount in cents (e.g. 50000 = 500.00)',
    )
    .action(async cmdOpts => {
      const parsedAmount = parseIntFlag(cmdOpts.amount, '--amount');
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          await api.holdBudgetForNextMonth(cmdOpts.month, parsedAmount);
          printOutput({ success: true }, opts.format);
        },
        { mutates: true },
      );
    });

  budgets
    .command('reset-hold')
    .description('Reset budget hold for a month')
    .requiredOption('--month <month>', 'Budget month (YYYY-MM)')
    .action(async cmdOpts => {
      const opts = program.opts();
      await withConnection(
        opts,
        async () => {
          await api.resetBudgetHold(cmdOpts.month);
          printOutput({ success: true }, opts.format);
        },
        { mutates: true },
      );
    });
}
