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

import { send } from '@actual-app/core/platform/client/connection';
import type {
  AccountEntity,
  GoCardlessToken,
} from '@actual-app/core/types/models';

import { pushModal } from './modals/modalsSlice';
import type { AppDispatch } from './redux/store';

function _authorize(
  dispatch: AppDispatch,
  {
    onSuccess,
    onClose,
  }: {
    onSuccess: (data: GoCardlessToken) => Promise<void>;
    onClose?: () => void;
  },
) {
  dispatch(
    pushModal({
      modal: {
        name: 'gocardless-external-msg',
        options: {
          onMoveExternal: async ({ institutionId }) => {
            const resp = await send('gocardless-create-web-token', {
              institutionId,
              accessValidForDays: 90,
            });

            if ('error' in resp) return resp;
            if ('error_code' in resp) {
              return { error: 'unknown', message: resp.error_type };
            }
            const { link, requisitionId } = resp;
            window.Actual.openURLInBrowser(link);

            return send('gocardless-poll-web-token', {
              requisitionId,
            });
          },
          onClose,
          onSuccess,
        },
      },
    }),
  );
}

export async function authorizeBank(
  dispatch: AppDispatch,
  upgradingAccountId?: AccountEntity['id'],
) {
  _authorize(dispatch, {
    onSuccess: async data => {
      dispatch(
        pushModal({
          modal: {
            name: 'select-linked-accounts',
            options: {
              externalAccounts: data.accounts,
              requisitionId: data.id,
              syncSource: 'goCardless',
              upgradingAccountId,
            },
          },
        }),
      );
    },
  });
}
