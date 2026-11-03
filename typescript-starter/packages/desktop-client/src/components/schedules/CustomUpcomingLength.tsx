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

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@actual-app/components/input';
import { Select } from '@actual-app/components/select';

type CustomUpcomingLengthProps = {
  onChange: (value: string) => void;
  tempValue: string;
};

export function CustomUpcomingLength({
  onChange,
  tempValue,
}: CustomUpcomingLengthProps) {
  const { t } = useTranslation();

  const options = [
    { value: 'day', label: t('Days') },
    { value: 'week', label: t('Weeks') },
    { value: 'month', label: t('Months') },
    { value: 'year', label: t('Years') },
  ];

  const timePeriod =
    tempValue === 'custom' ? ['1', 'day'] : tempValue.split('-');

  const [numValue, setNumValue] = useState(
    Number.parseInt(timePeriod[0], 10) || 1,
  );
  const [unit, setUnit] = useState(timePeriod[1] ?? 'day');

  useEffect(() => {
    onChange(`${numValue}-${unit}`);
  }, [numValue, onChange, unit]);

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 10 }}
    >
      <Input
        id="length"
        style={{ width: 40 }}
        type="number"
        min={1}
        onChangeValue={value => setNumValue(parseInt(value))}
        defaultValue={numValue || 1}
      />
      <Select
        options={options.map(x => [x.value, x.label])}
        value={unit}
        onChange={newValue => setUnit(newValue)}
      />
    </div>
  );
}
