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

import React, {useEffect, useRef} from 'react';
import {Form} from 'react-aria-components';
import {useTranslation} from 'react-i18next';

import {Button} from '@actual-app/components/button';
import {Input} from '@actual-app/components/input';
import {SpaceBetween} from '@actual-app/components/space-between';
import {Text} from '@actual-app/components/text';
import {theme} from '@actual-app/components/theme';

import {FormField, FormLabel} from '#components/forms';

export function NameFilter({
  menuItem,
  name,
  setName,
  adding,
  onAddUpdate,
  err,
}: {
  menuItem: string;
  name: string;
  setName: (item: string) => void;
  adding: boolean;
  onAddUpdate: () => void;
  err: string | null;
}) {
  const {t} = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <>
      {menuItem !== 'update-filter' && (
        <Form
          onSubmit={e => {
            e.preventDefault();
            onAddUpdate();
          }}
        >
          <SpaceBetween
            style={{
              padding: 10,
              justifyContent: 'flex-end',
              alignItems: 'center',
            }}
          >
            <FormField style={{flex: 1}}>
              <FormLabel
                title={t('Filter name')}
                htmlFor="name-field"
                style={{userSelect: 'none'}}
              />
              <Input
                id="name-field"
                ref={inputRef}
                defaultValue={name || ''}
                onChangeValue={setName}
              />
            </FormField>
            <Button variant="primary" type="submit" style={{marginTop: 18}}>
              {adding ? t('Add') : t('Update')}
            </Button>
          </SpaceBetween>
        </Form>
      )}
      {err && (
        <SpaceBetween style={{padding: 10, alignItems: 'center'}}>
          <Text style={{color: theme.errorText}}>{err}</Text>
        </SpaceBetween>
      )}
    </>
  );
}
