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

import { theme } from '@actual-app/components/theme';
import { View } from '@actual-app/components/view';

import { Link } from './common/Link';

export function DevelopmentTopBar() {
  return (
    <View
      style={{
        padding: '6px 20px',
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        color: theme.warningText,
        backgroundColor: theme.warningBackground,
        borderBottom: `1px solid ${theme.warningBorder}`,
        zIndex: 1,
        flexShrink: 0,
      }}
    >
      <View>This is a demo build of Actual.</View>
      <View>
        <Link
          variant="external"
          linkColor="purple"
          to={`https://github.com/actualbudget/actual/pull/${import.meta.env.REACT_APP_REVIEW_ID}`}
        >
          Open the PR: #{import.meta.env.REACT_APP_REVIEW_ID}
        </Link>
      </View>
    </View>
  );
}
