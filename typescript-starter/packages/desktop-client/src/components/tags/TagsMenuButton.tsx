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

import { useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgDotsHorizontalTriple } from '@actual-app/components/icons/v1';
import {
  SvgSearchAlternate,
  SvgViewHide,
  SvgViewShow,
} from '@actual-app/components/icons/v2';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { View } from '@actual-app/components/view';

import { useSyncedPref } from '#hooks/useSyncedPref';
import { useDiscoverTagsMutation } from '#tags';

export function TagsMenuButton() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const { mutate: discoverTags } = useDiscoverTagsMutation();
  const [showHidden, setShowHidden] = useSyncedPref('show-hidden-tags');
  const triggerRef = useRef<HTMLButtonElement | null>(null);

  return (
    <View>
      <Button
        ref={triggerRef}
        variant="bare"
        aria-label={t('Menu')}
        onClick={() => setOpen(true)}
      >
        <SvgDotsHorizontalTriple width={17} height={17} />
      </Button>
      <Popover
        triggerRef={triggerRef}
        isOpen={open}
        isNonModal
        onOpenChange={setOpen}
      >
        <Menu
          items={[
            showHidden === 'true'
              ? {
                  name: 'set-dont-show-hidden',
                  text: t("Don't show hidden tags"),
                  icon: SvgViewHide,
                }
              : {
                  name: 'set-show-hidden',
                  text: t('Show hidden tags'),
                  icon: SvgViewShow,
                },
            {
              name: 'discover-tags',
              text: t('Discover new tags'),
              icon: SvgSearchAlternate,
            },
          ]}
          onMenuSelect={name => {
            switch (name) {
              case 'set-dont-show-hidden':
                setShowHidden('false');
                break;
              case 'set-show-hidden':
                setShowHidden('true');
                break;
              case 'discover-tags':
                discoverTags();
                break;
              default:
                console.error('Unhandled menu option', name);
            }
          }}
        />
      </Popover>
    </View>
  );
}
