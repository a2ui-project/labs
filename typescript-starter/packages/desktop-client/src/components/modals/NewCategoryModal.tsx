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

import { useTranslation } from 'react-i18next';

import { ModalHeader, ModalTitle } from '#components/common/Modal';
import type { Modal } from '#modals/modalsSlice';

import { SingleInputModal } from './SingleInputModal';

type NewCategoryModalProps = Extract<
  Modal,
  { name: 'new-category' }
>['options'];

export function NewCategoryModal({
  onValidate,
  onSubmit,
}: NewCategoryModalProps) {
  const { t } = useTranslation();
  return (
    <SingleInputModal
      name="new-category"
      Header={props => (
        <ModalHeader
          {...props}
          title={<ModalTitle title={t('New Category')} shrinkOnOverflow />}
        />
      )}
      inputPlaceholder={t('Category name')}
      buttonText={t('Add')}
      onValidate={onValidate}
      onSubmit={onSubmit}
    />
  );
}
