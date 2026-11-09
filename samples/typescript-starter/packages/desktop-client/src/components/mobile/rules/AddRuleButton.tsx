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

import React, {useCallback} from 'react';
import {useTranslation} from 'react-i18next';

import {Button} from '@actual-app/components/button';
import {SvgAdd} from '@actual-app/components/icons/v1';

import {useNavigate} from '#hooks/useNavigate';

export function AddRuleButton() {
  const {t} = useTranslation();
  const navigate = useNavigate();

  const handleAddRule = useCallback(() => {
    void navigate('/rules/new');
  }, [navigate]);

  return (
    <Button
      variant="bare"
      aria-label={t('Add new rule')}
      style={{margin: 10}}
      onPress={handleAddRule}
    >
      <SvgAdd width={20} height={20} />
    </Button>
  );
}
