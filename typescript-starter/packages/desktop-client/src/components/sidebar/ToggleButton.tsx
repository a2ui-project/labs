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
import type { ComponentPropsWithoutRef, CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgPin } from '@actual-app/components/icons/v1';
import { SvgArrowButtonLeft1 } from '@actual-app/components/icons/v2';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

type ToggleButtonProps = {
  isFloating: boolean;
  onFloat: ComponentPropsWithoutRef<typeof Button>['onPress'];
  style?: CSSProperties;
};

export function ToggleButton({
  style,
  isFloating,
  onFloat,
}: ToggleButtonProps) {
  const { t } = useTranslation();
  return (
    <View className="float" style={{ ...style, flexShrink: 0 }}>
      <Button
        variant="bare"
        aria-label={isFloating ? t('Pin sidebar') : t('Unpin sidebar')}
        onPress={onFloat}
        style={{ color: theme.buttonMenuBorder }}
      >
        {isFloating ? (
          <SvgPin
            style={{
              margin: -2,
              width: 15,
              height: 15,
              transform: 'rotate(45deg)',
            }}
          />
        ) : (
          <SvgArrowButtonLeft1 style={{ width: 13, height: 13 }} />
        )}
      </Button>
    </View>
  );
}
