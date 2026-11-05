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

import type {useTranslation} from 'react-i18next';

import type {AccountEntity, PayeeEntity, TransactionEntity} from '@actual-app/core/types/models';

type GetPrettyPayeeProps = {
  t: ReturnType<typeof useTranslation>['t'];
  transaction?: TransactionEntity;
  payee?: PayeeEntity;
  transferAccount?: AccountEntity;
};

export function getPrettyPayee({t, transaction, payee, transferAccount}: GetPrettyPayeeProps) {
  if (!transaction) {
    return '';
  }

  if (transferAccount) {
    return t('Transfer {{direction}} {{accountName}}', {
      direction: transaction?.amount > 0 ? t('from') : t('to'),
      accountName: transferAccount.name,
    });
  } else if (transaction.is_parent) {
    return t('Split');
  } else if (payee) {
    return payee.name;
  }

  return '';
}
