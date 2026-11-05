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

import {Tree} from 'react-aria-components';
import type {Key} from 'react-aria-components';

import {css} from '@emotion/css';

import {AccountGroupHeader} from './AccountGroupHeader';
import {AccountRow} from './AccountRow';
import {treeKeys} from './treeKeys';
import {useAccountTreeDragAndDrop} from './useAccountTreeDragAndDrop';
import type {AccountTreeSide} from './useAccountTreeDragAndDrop';
import type {GroupBucket} from './useSidebarAccountTree';

type AccountTreeProps = {
  label: string;
  side: AccountTreeSide;
  buckets: GroupBucket[];
  showSyncDot: boolean;
  isDragDisabled: boolean;
  isBucketOpen?: (bucket: GroupBucket) => boolean;
  onToggleBucket?: (bucket: GroupBucket) => void;
};

export function AccountTree({
  label,
  side,
  buckets,
  showSyncDot,
  isDragDisabled,
  isBucketOpen,
  onToggleBucket,
}: AccountTreeProps) {
  const {dragAndDropHooks, isGroupDropZoneActive, isDraggingGroup} = useAccountTreeDragAndDrop({
    side,
    buckets,
    isDisabled: isDragDisabled,
  });

  const groupBuckets = buckets.filter(bucket => bucket.group != null);
  const expandedKeys = new Set<Key>(
    groupBuckets
      .filter(bucket => !isDraggingGroup && (isBucketOpen?.(bucket) ?? true))
      .map(bucket => treeKeys.group(bucket.group?.id ?? '')),
  );

  const onExpandedChange = (keys: Set<Key>) => {
    for (const bucket of groupBuckets) {
      const key = treeKeys.group(bucket.group?.id ?? '');
      if (keys.has(key) !== expandedKeys.has(key)) {
        onToggleBucket?.(bucket);
      }
    }
  };

  return (
    <Tree
      aria-label={label}
      selectionMode="none"
      expandedKeys={expandedKeys}
      onExpandedChange={onExpandedChange}
      dragAndDropHooks={dragAndDropHooks}
      className={css({outline: 'none'})}
    >
      {buckets.map(bucket =>
        bucket.group == null ? (
          bucket.accounts.map(account => (
            <AccountRow
              key={treeKeys.account(account.id)}
              account={account}
              isClosed={side === 'closed'}
              showSyncDot={showSyncDot}
            />
          ))
        ) : (
          <AccountGroupHeader
            key={treeKeys.group(bucket.group.id)}
            group={bucket.group}
            side={side === 'off' ? 'off' : 'on'}
            accounts={bucket.accounts}
            failedCount={bucket.failedCount}
            showSyncDot={showSyncDot}
            isDropZoneActive={isGroupDropZoneActive(bucket.group.id)}
          />
        ),
      )}
    </Tree>
  );
}
