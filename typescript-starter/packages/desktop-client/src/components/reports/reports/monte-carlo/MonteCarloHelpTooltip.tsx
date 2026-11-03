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

import { useState } from 'react';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgQuestion } from '@actual-app/components/icons/v1';
import { styles } from '@actual-app/components/styles';
import { Text } from '@actual-app/components/text';
import { Tooltip } from '@actual-app/components/tooltip';
import { View } from '@actual-app/components/view';

type MonteCarloHelpTooltipProps = {
  /** The explanatory text, typically a Trans block */
  children: ReactNode;
  placement?: ComponentPropsWithoutRef<typeof Tooltip>['placement'];
};

/**
 * The report's standard question-mark help icon. The explanation shows on
 * hover, and also while the trigger has keyboard focus - the shared
 * Tooltip only tracks the mouse, so focus is wired up here through its
 * triggerProps escape hatch.
 */
export function MonteCarloHelpTooltip({
  children,
  placement = 'bottom start',
}: MonteCarloHelpTooltipProps) {
  const { t } = useTranslation();
  const [isFocused, setIsFocused] = useState(false);

  return (
    <Tooltip
      content={
        <View style={{ maxWidth: 300 }}>
          <Text>{children}</Text>
        </View>
      }
      placement={placement}
      style={styles.tooltip}
      triggerProps={isFocused ? { isOpen: true } : {}}
    >
      <Button
        variant="bare"
        aria-label={t('Help')}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{ padding: 0, minHeight: 'auto' }}
      >
        <SvgQuestion height={12} width={12} />
      </Button>
    </Tooltip>
  );
}
