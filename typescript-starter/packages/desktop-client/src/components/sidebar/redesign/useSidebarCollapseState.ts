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

import {useLocalPref} from '#hooks/useLocalPref';

import type {GroupBucket, SidebarAccountTree} from './useSidebarAccountTree';

type Side = 'on' | 'off';

export type SidebarSectionKey =
  | 'onbudget'
  | 'offbudget'
  | 'closed'
  | `group-${string}-${Side}`
  | `ungrouped-${Side}`;

export function bucketKey(side: Side, bucket: GroupBucket): SidebarSectionKey {
  return bucket.group ? `group-${bucket.group.id}-${side}` : `ungrouped-${side}`;
}

type UseSidebarCollapseStateArgs = {
  tree: SidebarAccountTree;
  isSearching: boolean;
};

export function useSidebarCollapseState({tree, isSearching}: UseSidebarCollapseStateArgs): {
  isOpen: (key: SidebarSectionKey) => boolean;
  toggle: (key: SidebarSectionKey) => void;
  allOpen: boolean;
  toggleAll: () => void;
} {
  const [openState = {}, setOpenState] = useLocalPref('sidebar.accountsOpenState');

  const isOpen = (key: SidebarSectionKey) =>
    isSearching ? true : (openState[key] ?? key !== 'closed');
  const toggle = (key: SidebarSectionKey) => setOpenState({...openState, [key]: !isOpen(key)});

  const allKeys: SidebarSectionKey[] = [
    'onbudget',
    'offbudget',
    ...tree.onBudget.buckets
      .filter(bucket => bucket.group != null)
      .map(bucket => bucketKey('on', bucket)),
    ...tree.offBudget.buckets
      .filter(bucket => bucket.group != null)
      .map(bucket => bucketKey('off', bucket)),
  ];
  const allOpen = allKeys.every(isOpen);
  const toggleAll = () =>
    setOpenState({
      ...openState,
      ...Object.fromEntries(allKeys.map(key => [key, !allOpen])),
    });

  return {isOpen, toggle, allOpen, toggleAll};
}
