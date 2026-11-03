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

import type { ReactNode } from 'react';

import Admonition from '@theme/Admonition';

type ExperimentalFeatureWarningProps = {
  issueId?: string;
  children?: ReactNode;
};

export function ExperimentalFeatureWarning({
  issueId,
  children,
}: ExperimentalFeatureWarningProps) {
  return (
    <Admonition type="warning">
      <p>
        This is an <strong>experimental feature</strong>. That means we're still
        working on finishing it. There may be bugs, missing functionality or
        incomplete documentation, and we may decide to remove the feature in a
        future release. If you have any feedback, please{' '}
        {issueId ? (
          <>
            comment on the{' '}
            <a
              href={`https://github.com/actualbudget/actual/issues/${issueId}`}
              rel="noopener noreferrer"
            >
              dedicated feedback issue
            </a>
          </>
        ) : (
          <a
            href="https://github.com/actualbudget/actual/issues"
            rel="noopener noreferrer"
          >
            open an issue
          </a>
        )}{' '}
        or post a message in the Discord.
      </p>
      {children}
    </Admonition>
  );
}
