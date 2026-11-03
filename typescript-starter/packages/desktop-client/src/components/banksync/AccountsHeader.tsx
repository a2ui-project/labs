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

import React from 'react';
import { useTranslation } from 'react-i18next';

import { Cell, TableHeader } from '#components/table';

type AccountsHeaderProps = {
  unlinked: boolean;
};

export function AccountsHeader({ unlinked }: AccountsHeaderProps) {
  const { t } = useTranslation();

  return (
    <TableHeader>
      <Cell
        value={t('Account')}
        width={!unlinked ? 250 : 'flex'}
        style={{ paddingLeft: '10px' }}
      />
      {!unlinked && (
        <>
          <Cell
            value={t('Bank')}
            width="flex"
            style={{ paddingLeft: '10px' }}
          />
          <Cell
            value={t('Last sync')}
            width={160}
            style={{ paddingLeft: '10px' }}
          />
          <Cell value="" width={100} style={{ paddingLeft: '10px' }} />
        </>
      )}
    </TableHeader>
  );
}
