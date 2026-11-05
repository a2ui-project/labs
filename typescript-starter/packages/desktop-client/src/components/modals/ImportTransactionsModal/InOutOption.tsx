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
import {useTranslation} from 'react-i18next';

import {Input} from '@actual-app/components/input';
import {View} from '@actual-app/components/view';

import {LabeledCheckbox} from '#components/forms/LabeledCheckbox';

type InOutOptionProps = {
  inOutMode: boolean;
  outValue: string;
  disabled?: boolean;
  onToggle: () => void;
  onChangeText: (newValue: string) => void;
};

export function InOutOption({
  inOutMode,
  outValue,
  disabled,
  onToggle,
  onChangeText,
}: InOutOptionProps) {
  const {t} = useTranslation();

  return (
    <View style={{flexDirection: 'row', gap: 10, height: 28}}>
      <LabeledCheckbox id="form_inOut" checked={inOutMode} disabled={disabled} onChange={onToggle}>
        {inOutMode
          ? t('In/Out outflow value')
          : t('Select column to specify if amount goes in/out')}
      </LabeledCheckbox>
      {inOutMode && (
        <Input
          type="text"
          value={outValue}
          onChangeValue={onChangeText}
          placeholder={t("Value for out rows, e.g: 'Credit'")}
        />
      )}
    </View>
  );
}
