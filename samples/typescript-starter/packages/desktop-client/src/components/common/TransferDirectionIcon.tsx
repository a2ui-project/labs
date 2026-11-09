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

import {SvgLeftArrow2, SvgRightArrow2} from '@actual-app/components/icons/v0';
import type {CSSProperties} from '@actual-app/components/styles';

type TransferDirectionIconProps = {
  isDeposit?: boolean;
  style?: CSSProperties;
};

export function TransferDirectionIcon({isDeposit, style}: TransferDirectionIconProps) {
  return isDeposit ? <SvgLeftArrow2 style={style} /> : <SvgRightArrow2 style={style} />;
}
