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

import {useResponsive} from '@actual-app/components/hooks/useResponsive';

import {LoadComponent} from '#components/util/LoadComponent';

import type * as NarrowComponents from './narrow';
import type * as WideComponents from './wide';

const loadNarrow = () => import(/* webpackChunkName: "narrow-components" */ './narrow');
const loadWide = () => import(/* webpackChunkName: "wide-components" */ './wide');

export function WideComponent({name}: {name: keyof typeof WideComponents}) {
  return <LoadComponent name={name} importer={loadWide} />;
}

export function NarrowAlternate({
  name,
}: {
  name: keyof typeof WideComponents & keyof typeof NarrowComponents;
}) {
  const {isNarrowWidth} = useResponsive();
  return <LoadComponent name={name} importer={isNarrowWidth ? loadNarrow : loadWide} />;
}
