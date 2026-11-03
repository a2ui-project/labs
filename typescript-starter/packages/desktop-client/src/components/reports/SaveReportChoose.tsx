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

import React, { useEffect, useRef, useState } from 'react';
import { Form } from 'react-aria-components';
import { Trans } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { Text } from '@actual-app/components/text';
import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { GenericInput } from '#components/util/GenericInput';

type SaveReportChooseProps = {
  onApply: (cond: string) => void;
};

export function SaveReportChoose({ onApply }: SaveReportChooseProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState('');
  const [value, setValue] = useState('');

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  return (
    <>
      <Form
        onSubmit={e => {
          e.preventDefault();

          if (!value) {
            setErr('Invalid report entered');
            return;
          }

          onApply(value);
        }}
      >
        <View style={{ flexDirection: 'row', align: 'center' }}>
          <Text style={{ userSelect: 'none', flex: 1 }}>
            <Trans>Choose Report</Trans>
          </Text>
          <View style={{ flex: 1 }} />
        </View>
        <GenericInput
          ref={inputRef}
          field="report"
          type="saved"
          value={value}
          style={{ marginTop: 10 }}
          onChange={setValue}
        />

        <View
          style={{
            marginTop: 15,
            flexDirection: 'row',
            justifyContent: 'flex-end',
            alignItems: 'center',
          }}
        >
          <Button variant="primary" type="submit">
            <Trans>Apply</Trans>
          </Button>
        </View>
      </Form>
      {err !== '' ? (
        <View style={{ padding: 10, alignItems: 'center' }}>
          <Text style={{ color: theme.errorText }}>{err}</Text>
        </View>
      ) : (
        <View />
      )}
    </>
  );
}
