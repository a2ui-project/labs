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

import React, {useEffect} from 'react';
import type {FallbackProps} from 'react-error-boundary';
import {Trans} from 'react-i18next';

import {Button} from '@actual-app/components/button';
import {styles} from '@actual-app/components/styles';
import {Text} from '@actual-app/components/text';
import {theme} from '@actual-app/components/theme';
import {View} from '@actual-app/components/view';

export function FeatureErrorFallback({error, resetErrorBoundary}: FallbackProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const message = error instanceof Error ? error.message : undefined;

  return (
    <View
      style={{
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
      }}
    >
      <Text style={{...styles.mediumText, color: theme.errorText}}>
        <Trans>Something went wrong loading this section.</Trans>
      </Text>
      {message && (
        <Text
          style={{
            ...styles.smallText,
            fontFamily: 'monospace',
            color: theme.errorText,
            marginTop: 10,
            maxWidth: 600,
            textAlign: 'center',
            userSelect: 'text',
          }}
        >
          {message}
        </Text>
      )}
      <Button onPress={resetErrorBoundary} style={{marginTop: 15}}>
        <Trans>Try again</Trans>
      </Button>
    </View>
  );
}
