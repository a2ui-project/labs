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
import type { ComponentProps } from 'react';
import BasePullToRefresh from 'react-simple-pull-to-refresh';

import type { CSSProperties } from '@actual-app/components/styles';
import { css } from '@emotion/css';

type PullToRefreshProps = ComponentProps<typeof BasePullToRefresh> & {
  style?: CSSProperties;
};

export function PullToRefresh(props: PullToRefreshProps) {
  return (
    <div style={{ overflow: 'auto', flex: 1 }}>
      <BasePullToRefresh
        pullDownThreshold={80}
        resistance={2}
        className={css({
          '& .ptr__pull-down': {
            textAlign: 'center',
          },
          '& .ptr__children': {
            overflow: 'hidden auto',
          },
          ...(props.style || {}),
        })}
        {...props}
        // Force async because the library errors out when a sync onRefresh method is provided.
        onRefresh={async () => {
          await props.onRefresh?.();
        }}
      />
    </div>
  );
}
