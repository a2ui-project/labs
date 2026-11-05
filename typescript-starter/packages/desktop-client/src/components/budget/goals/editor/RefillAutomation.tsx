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

import {Trans, useTranslation} from 'react-i18next';

import {Button} from '@actual-app/components/button';
import {SpaceBetween} from '@actual-app/components/space-between';
import {View} from '@actual-app/components/view';

import {Warning} from '#components/alerts';

type RefillAutomationProps = {
  hasLimitAutomation: boolean;
  onAddLimitAutomation?: () => void;
};

export function RefillAutomation({
  hasLimitAutomation,
  onAddLimitAutomation,
}: RefillAutomationProps) {
  const {t} = useTranslation();

  return (
    <SpaceBetween align="center" gap={10} style={{marginTop: 10}}>
      {!hasLimitAutomation && (
        <Warning
          style={{width: '100%', alignItems: 'center'}}
          iconStyle={{alignSelf: 'unset', paddingTop: 0, marginTop: -2}}
        >
          <SpaceBetween
            gap={10}
            align="center"
            style={{width: '100%', justifyContent: 'space-between'}}
          >
            <View>
              <Trans>Add a balance limit automation to set the refill target.</Trans>
            </View>
            {onAddLimitAutomation && (
              <Button
                variant="bare"
                onPress={onAddLimitAutomation}
                aria-label={t('Add balance limit automation')}
              >
                <Trans>Add balance limit</Trans>
              </Button>
            )}
          </SpaceBetween>
        </Warning>
      )}
    </SpaceBetween>
  );
}
