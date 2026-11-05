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

import type {RefObject} from 'react';

import {Button} from '@actual-app/components/button';
import {ColorPicker} from '@actual-app/components/color-picker';
import type {TagEntity} from '@actual-app/core/types/models';

import {useTagCSS} from '#hooks/useTagCSS';
import {useUpdateTagMutation} from '#tags';

type TagEditorProps = {
  tag: TagEntity;
  ref: RefObject<HTMLButtonElement | null>;
};

export const TagEditor = ({tag, ref}: TagEditorProps) => {
  const getTagCSS = useTagCSS({ellipsis: true});
  const {mutate: updateTag} = useUpdateTagMutation();

  const formattedTag = <>#{tag.tag}</>;

  return (
    <ColorPicker
      value={tag.color ?? undefined}
      onChange={color => {
        updateTag({tag: {...tag, color: color.toString('hex')}});
      }}
    >
      <Button variant="bare" className={getTagCSS(tag.tag)} ref={ref}>
        {formattedTag}
      </Button>
    </ColorPicker>
  );
};
