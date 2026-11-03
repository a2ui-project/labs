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

import { Button } from '#Button';
import { SvgCheveronLeft, SvgCheveronRight } from '#icons/v1';
import { Text } from '#Text';
import { View } from '#View';

type NavRowProps = {
  label: string;
  previousLabel: string;
  nextLabel: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
};

export function NavRow({
  label,
  previousLabel,
  nextLabel,
  canPrev,
  canNext,
  onPrev,
  onNext,
}: NavRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
      }}
    >
      <Button
        aria-label={previousLabel}
        variant="bare"
        isDisabled={!canPrev}
        onPress={onPrev}
      >
        <SvgCheveronLeft width={16} height={16} />
      </Button>
      <Text style={{ fontWeight: 'bold' }}>{label}</Text>
      <Button
        aria-label={nextLabel}
        variant="bare"
        isDisabled={!canNext}
        onPress={onNext}
      >
        <SvgCheveronRight width={16} height={16} />
      </Button>
    </View>
  );
}
