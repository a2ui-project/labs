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

import React, { useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import { Trans, useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { useResponsive } from '@actual-app/components/hooks/useResponsive';
import {
  SvgMoonStars,
  SvgSun,
  SvgSystem,
} from '@actual-app/components/icons/v2';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { Tooltip } from '@actual-app/components/tooltip';
import type { Theme } from '@actual-app/core/types/prefs';

import { themeOptions, useTheme } from '#style';

type ThemeSelectorProps = {
  style?: CSSProperties;
};

export function ThemeSelector({ style }: ThemeSelectorProps) {
  const [theme, switchTheme] = useTheme();
  const [menuOpen, setMenuOpen] = useState(false);
  const triggerRef = useRef(null);

  const { isNarrowWidth } = useResponsive();
  const { t } = useTranslation();

  const themeIcons = {
    light: SvgSun,
    dark: SvgMoonStars,
    auto: SvgSystem,
    midnight: SvgMoonStars,
  } as const;

  type ThemeIconKey = keyof typeof themeIcons;

  function onMenuSelect(newTheme: Theme) {
    setMenuOpen(false);
    switchTheme(newTheme);
  }

  const Icon = themeIcons[theme as ThemeIconKey] || SvgSun;

  if (isNarrowWidth) {
    return null;
  }

  return (
    <>
      <Tooltip
        placement="bottom end"
        content={<Trans>Switch theme</Trans>}
        triggerProps={{ isDisabled: menuOpen }}
      >
        <Button
          ref={triggerRef}
          variant="bare"
          aria-label={t('Switch theme')}
          onPress={() => setMenuOpen(true)}
          style={style}
        >
          <Icon style={{ width: 13, height: 13, color: 'inherit' }} />
        </Button>
      </Tooltip>

      <Popover
        offset={8}
        triggerRef={triggerRef}
        isOpen={menuOpen}
        onOpenChange={() => setMenuOpen(false)}
      >
        <Menu
          onMenuSelect={onMenuSelect}
          items={themeOptions.map(([name, text]) => ({ name, text }))}
        />
      </Popover>
    </>
  );
}
