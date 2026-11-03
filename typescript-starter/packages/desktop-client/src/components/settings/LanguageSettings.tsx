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
import { Trans, useTranslation } from 'react-i18next';

import { Menu } from '@actual-app/components/menu';
import { Select } from '@actual-app/components/select';
import type { SelectOption } from '@actual-app/components/select';
import { Text } from '@actual-app/components/text';
import type { TFunction } from 'i18next';

import { Link } from '#components/common/Link';
import { useGlobalPref } from '#hooks/useGlobalPref';
import { availableLanguages, setI18NextLanguage } from '#i18n';

import { Setting } from './UI';

const languageDisplayNameOverride: { [key: string]: string } = {
  'pt-BR': 'Português (Brasil)',
};

const languageOptions = (t: TFunction): SelectOption[] =>
  [
    ['', t('System default')] as [string, string],
    Menu.line as typeof Menu.line,
  ].concat(
    availableLanguages.map(lang => [
      lang,
      lang in languageDisplayNameOverride
        ? languageDisplayNameOverride[lang]
        : new Intl.DisplayNames([lang], {
            type: 'language',
          }).of(lang) || lang,
    ]),
  );

export function LanguageSettings() {
  const { t } = useTranslation();
  const [language, setLanguage] = useGlobalPref('language');
  const isEnabled = !!availableLanguages.length;

  return (
    <Setting
      primaryAction={
        <Select
          aria-label={t('Select language')}
          options={languageOptions(t)}
          value={isEnabled ? (language ?? '') : 'not-available'}
          defaultLabel={
            isEnabled ? t('Select language') : t('No languages available')
          }
          onChange={value => {
            setLanguage(value);
            setI18NextLanguage(value);
          }}
          disabled={!isEnabled}
        />
      }
    >
      <Text>
        {isEnabled ? (
          <Trans>
            <strong>Language</strong> is the display language of all text.
            Please note that no warranty is provided for the accuracy or
            completeness of non-English translations. If you encounter a
            translation error, feel free to make a suggestion on{' '}
            <Link
              variant="external"
              to={
                'https://hosted.weblate.org/projects/actualbudget/actual/' +
                (language ?? '')
              }
              linkColor="purple"
            >
              Weblate
            </Link>
            .
          </Trans>
        ) : (
          <Trans>
            <strong>Language</strong> support is not available. Please follow
            the instructions{' '}
            <Link
              variant="external"
              to="https://actualbudget.org/docs/install/build-from-source#translations"
            >
              here
            </Link>{' '}
            to add missing translation files.
          </Trans>
        )}
      </Text>
    </Setting>
  );
}
