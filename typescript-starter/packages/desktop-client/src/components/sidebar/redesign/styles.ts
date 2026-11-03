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

import type { CSSProperties } from '@actual-app/components/styles';
import { theme } from '@actual-app/components/theme';
import { radius } from '@actual-app/components/tokens';

export const sectionLabelStyle = {
  fontSize: 13,
  fontWeight: 600,
} satisfies CSSProperties;

export const groupLabelStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: theme.sidebarTextSubdued,
} satisfies CSSProperties;

export const dropZoneStyle = {
  backgroundColor: theme.sidebarItemBackgroundHover,
  boxShadow: `inset 0 0 0 1px ${theme.sidebarItemAccentSelected}`,
  borderRadius: radius.sm,
} satisfies CSSProperties;
