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
import React, { useEffect, useState } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgCheck } from '@actual-app/components/icons/v2';
import { View } from '@actual-app/components/view';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { Notes } from '#components/Notes';
import { useNotes } from '#hooks/useNotes';
import type { Modal as ModalType } from '#modals/modalsSlice';

type NotesModalProps = Extract<ModalType, { name: 'notes' }>['options'];

export function NotesModal({ id, name, onSave }: NotesModalProps) {
  const { t } = useTranslation();
  const originalNotes = useNotes(id);

  const [notes, setNotes] = useState(originalNotes);
  useEffect(() => setNotes(originalNotes), [originalNotes]);

  function _onSave() {
    if (notes !== originalNotes) {
      onSave?.(id, notes);
    }
  }

  return (
    <Modal
      name="notes"
      containerProps={{
        style: { height: '50vh' },
      }}
    >
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Notes: {{name}}', { name })}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <View
            style={{
              flex: 1,
              flexDirection: 'column',
            }}
          >
            <Notes
              notes={notes}
              editable
              focused
              getStyle={() => ({
                borderRadius: 6,
                flex: 1,
                minWidth: 0,
              })}
              onChange={setNotes}
            />
            <View
              style={{
                flexDirection: 'column',
                alignItems: 'center',
                justifyItems: 'center',
                width: '100%',
                paddingTop: 10,
              }}
            >
              <Button
                variant="primary"
                style={{
                  fontSize: 17,
                  fontWeight: 400,
                  width: '100%',
                }}
                onPress={() => {
                  _onSave();
                  state.close();
                }}
              >
                <SvgCheck width={17} height={17} style={{ paddingRight: 5 }} />
                <Trans>Save notes</Trans>
              </Button>
            </View>
          </View>
        </>
      )}
    </Modal>
  );
}
