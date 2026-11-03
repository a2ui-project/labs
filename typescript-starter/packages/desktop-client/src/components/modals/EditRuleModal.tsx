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

import { theme } from '@actual-app/components/theme';
import type { NewRuleEntity, RuleEntity } from '@actual-app/core/types/models';

import { Modal, ModalCloseButton, ModalHeader } from '#components/common/Modal';
import { RuleEditor } from '#components/rules/RuleEditor';

type EditRuleModalProps = {
  rule: RuleEntity | NewRuleEntity;
  onSave?: (rule: RuleEntity) => void;
};

export function EditRuleModal({
  rule: defaultRule,
  onSave: originalOnSave,
}: EditRuleModalProps) {
  const { t } = useTranslation();

  return (
    <Modal name="edit-rule">
      {({ state }) => (
        <>
          <ModalHeader
            title={t('Rule')}
            rightContent={<ModalCloseButton onPress={() => state.close()} />}
          />
          <RuleEditor
            rule={defaultRule}
            onSave={rule => {
              originalOnSave?.(rule);
              state.close();
            }}
            onCancel={() => state.close()}
            style={{
              maxWidth: '100%',
              width: 900,
              height: '80vh',
              flexGrow: 0,
              flexShrink: 0,
              flexBasis: 'auto',
              overflow: 'hidden',
              color: theme.pageTextLight,
            }}
          />
        </>
      )}
    </Modal>
  );
}
