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
import {Trans} from 'react-i18next';

import {Text} from '@actual-app/components/text';
import {View} from '@actual-app/components/view';

import {Link} from '#components/common/Link';
import {useServerURL} from '#components/ServerContext';

export function ServerURL() {
  const url = useServerURL();

  return (
    <View
      style={{
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        justifyContent: 'center',
        flexDirection: 'row',
        marginBottom: 'calc(15px + env(safe-area-inset-bottom))',
        zIndex: 5000,
      }}
    >
      <Text>
        {url ? (
          <Trans>
            Using server: <strong>{url}</strong>
          </Trans>
        ) : (
          <Trans>Using this device only</Trans>
        )}
      </Text>
      <Link variant="internal" to="/config-server" style={{marginLeft: 15}}>
        {url ? <Trans>Change</Trans> : <Trans>Set up sync</Trans>}
      </Link>
    </View>
  );
}
