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

// @ts-strict-ignore
import React from 'react';
import {useTranslation} from 'react-i18next';

import {Text} from '@actual-app/components/text';
import {TextOneLine} from '@actual-app/components/text-one-line';
import {theme} from '@actual-app/components/theme';

import {useAccount} from '#hooks/useAccount';
import {usePayee} from '#hooks/usePayee';

type DisplayIdProps = {
  type: 'accounts' | 'payees';
  id: string;
  noneColor?: string;
};

export function DisplayId({type, id, noneColor = theme.pageTextSubdued}: DisplayIdProps) {
  return type === 'accounts' ? (
    <AccountDisplayId id={id} noneColor={noneColor} />
  ) : (
    <PayeeDisplayId id={id} noneColor={noneColor} />
  );
}

function AccountDisplayId({id, noneColor}) {
  const {t} = useTranslation();
  const account = useAccount(id);
  return (
    <Text
      style={account == null ? {color: noneColor} : null}
      title={account ? account.name : t('None')}
    >
      {account ? account.name : t('None')}
    </Text>
  );
}

function PayeeDisplayId({id, noneColor}) {
  const {t} = useTranslation();
  const {data: payee} = usePayee(id);
  return (
    <TextOneLine
      style={payee == null ? {color: noneColor} : null}
      title={payee ? payee.name : t('None')}
    >
      {payee ? payee.name : t('None')}
    </TextOneLine>
  );
}
