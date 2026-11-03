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

import { ModeButton } from '#ModeButton';
import { theme } from '#theme';
import { View } from '#View';

import type { DateRangeGranularity } from './util';

const segmentStyle = { borderRadius: 0, fontSize: 12, padding: '4px 12px' };

type GranularityToggleProps = {
  value: DateRangeGranularity;
  monthLabel: string;
  dayLabel: string;
  onChange: (value: DateRangeGranularity) => void;
};

export function GranularityToggle({
  value,
  monthLabel,
  dayLabel,
  onChange,
}: GranularityToggleProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        border: `1px solid ${theme.buttonNormalBorder}`,
        borderRadius: 4,
        overflow: 'hidden',
        alignSelf: 'flex-start',
      }}
    >
      <ModeButton
        selected={value === 'month'}
        onSelect={() => onChange('month')}
        style={segmentStyle}
      >
        {monthLabel}
      </ModeButton>
      <ModeButton
        selected={value === 'day'}
        onSelect={() => onChange('day')}
        style={segmentStyle}
      >
        {dayLabel}
      </ModeButton>
    </View>
  );
}
