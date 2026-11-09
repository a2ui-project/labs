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

import {useMemo} from 'react';
import type {ComponentProps} from 'react';
import {Trans, useTranslation} from 'react-i18next';

import {Button} from '@actual-app/components/button';
import {Menu} from '@actual-app/components/menu';
import {View} from '@actual-app/components/view';

import {Modal, ModalCloseButton, ModalHeader} from '#components/common/Modal';
import {useDashboardPages} from '#hooks/useDashboardPages';
import type {Modal as ModalType} from '#modals/modalsSlice';

type CopyWidgetToDashboardModalProps = Extract<
  ModalType,
  {name: 'copy-widget-to-dashboard'}
>['options'];

export function CopyWidgetToDashboardModal({onSelect}: CopyWidgetToDashboardModalProps) {
  const {t} = useTranslation();
  const {data: dashboardPages = []} = useDashboardPages();

  const items: ComponentProps<typeof Menu<string>>['items'] = useMemo(
    () => dashboardPages.map(d => ({name: d.id, text: d.name})),
    [dashboardPages],
  );

  return (
    <Modal name="copy-widget-to-dashboard">
      {({state}) => (
        <>
          <ModalHeader
            title={t('Copy to dashboard')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />

          <View style={{lineHeight: 1.5}}>
            {items.length ? (
              <Menu
                items={items}
                onMenuSelect={item => {
                  onSelect(item);
                  state.close();
                }}
              />
            ) : (
              <View>
                <Trans>No other dashboard pages available.</Trans>
              </View>
            )}

            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'flex-end',
                marginTop: 15,
              }}
            >
              <Button onPress={() => state.close()}>
                <Trans>Cancel</Trans>
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
