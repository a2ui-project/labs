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

import {Button} from 'react-aria-components';

import {SvgMenu} from '@actual-app/components/icons/v1';
import {styles} from '@actual-app/components/styles';
import {theme} from '@actual-app/components/theme';
import {radius} from '@actual-app/components/tokens';
import {css} from '@emotion/css';

export function DragHandle() {
  return (
    <Button
      slot="drag"
      className={css({
        ...styles.visuallyHidden,
        '&[data-focus-visible]': {
          position: 'static',
          width: 'auto',
          height: 'auto',
          margin: 0,
          overflow: 'visible',
          clip: 'auto',
          display: 'flex',
          alignItems: 'center',
          border: 'none',
          background: 'none',
          color: 'inherit',
          borderRadius: radius.sm,
          outline: `2px solid ${theme.formInputBorderSelected}`,
          outlineOffset: 1,
        },
      })}
    >
      <SvgMenu style={{width: 10, height: 10}} />
    </Button>
  );
}
