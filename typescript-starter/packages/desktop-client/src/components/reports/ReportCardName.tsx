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

import React from 'react';

import { InitialFocus } from '@actual-app/components/initial-focus';
import { Input } from '@actual-app/components/input';
import { styles } from '@actual-app/components/styles';

import { NON_DRAGGABLE_AREA_CLASS_NAME } from './constants';

type ReportCardNameProps = {
  name: string;
  isEditing: boolean;
  onChange: (newName: string) => void;
  onClose: () => void;
};

export const ReportCardName = ({
  name,
  isEditing,
  onChange,
  onClose,
}: ReportCardNameProps) => {
  if (isEditing) {
    return (
      <InitialFocus>
        <Input
          className={NON_DRAGGABLE_AREA_CLASS_NAME}
          defaultValue={name}
          onEnter={onChange}
          onUpdate={onChange}
          onEscape={onClose}
          style={{
            ...styles.mediumText,
            marginTop: -6,
            marginBottom: -1,
            marginLeft: -6,
            width: Math.max(20, name.length) + 'ch',
          }}
        />
      </InitialFocus>
    );
  }

  return (
    <h2
      style={{
        display: 'block',
        margin: 0,
        padding: 0,
        ...styles.mediumText,
        marginBottom: 5,
      }}
    >
      {name}
    </h2>
  );
};
