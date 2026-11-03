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

import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import { MonthPicker } from '@actual-app/components/month-picker';

import {
  hideNativeDateIconClassName,
  InputField,
} from '#components/mobile/MobileForms';
import { useLanguage } from '#hooks/useLocale';

type MonthInputProps = {
  id: string;
  value: string;
  onChange: (month: string) => void;
};

// mobile keeps the native month input; desktop uses the custom month picker
export function MonthInput({ id, value, onChange }: MonthInputProps) {
  const { t } = useTranslation();
  const language = useLanguage();
  const { isNarrowWidth } = useResponsive();
  if (isNarrowWidth) {
    return (
      <InputField
        id={id}
        type="month"
        value={value}
        onChange={event => onChange(event.target.value)}
        className={hideNativeDateIconClassName}
        style={{
          width: '100%',
          marginLeft: 0,
          marginRight: 0,
          boxSizing: 'border-box',
          WebkitAppearance: 'none',
          appearance: 'none',
        }}
      />
    );
  }
  return (
    <MonthPicker
      id={id}
      value={value}
      locale={language}
      placeholder={t('Select month')}
      labels={{ previous: t('Previous'), next: t('Next') }}
      onChange={onChange}
    />
  );
}
