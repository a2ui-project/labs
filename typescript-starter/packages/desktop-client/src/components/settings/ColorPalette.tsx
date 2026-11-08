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

import {View} from '@actual-app/components/view';

const DEFAULT_COLORS = ['#ccc', '#999', '#666', '#333', '#111', '#000'];

type ColorPaletteProps = {
  colors?: string[];
};

export function ColorPalette({colors}: ColorPaletteProps) {
  // Default fallback colors if not provided
  const paletteColors = colors ?? DEFAULT_COLORS;

  return (
    <View
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gridTemplateRows: 'repeat(2, 1fr)',
        width: '100%',
        flex: 1,
        minHeight: 0,
        borderRadius: 4,
        overflow: 'hidden',
      }}
    >
      {paletteColors.slice(0, 6).map((color, i) => (
        <div key={i} data-swatch style={{backgroundColor: color}} />
      ))}
    </View>
  );
}
