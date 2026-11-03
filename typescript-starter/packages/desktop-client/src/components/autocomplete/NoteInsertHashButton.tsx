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

import type { RefObject } from 'react';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgHash } from '@actual-app/components/icons/v0';

import { useCursorPosition } from '#hooks/useCursorPosition';
import { useInputRefValue } from '#hooks/useInputRefValue';

type NoteInsertHashButtonProps = {
  inputRef: RefObject<HTMLInputElement | null>;
};

export function NoteInsertHashButton({ inputRef }: NoteInsertHashButtonProps) {
  const { t } = useTranslation();
  const [inputValue, setInputValue] = useInputRefValue(inputRef);
  const [_, setCursorPosition] = useCursorPosition(inputRef);

  return (
    <Button
      variant="bare"
      aria-label={t('Add tag')}
      style={{ color: 'inherit', padding: 1 }}
      onPointerDown={e => e.preventDefault()}
      onClick={() => {
        if (!inputRef.current) return;
        const isFocused = document.activeElement === inputRef.current;
        const start = isFocused
          ? (inputRef.current.selectionStart ?? 0)
          : inputValue.length;
        const end = isFocused
          ? (inputRef.current.selectionEnd ?? 0)
          : inputValue.length;

        const before = inputValue.substring(0, start);
        const after = inputValue.substring(end);

        const space = start === 0 || before.match(/\s$/) ? '' : ' ';

        setInputValue(before + space + '#' + after);
        inputRef.current.focus();
        setCursorPosition(start + 1 + space.length);
        // so Safari requires that I do inputRef.current.focus() synchronously,
        // but Chrome doesn't work unless I do it after. We do both this way.
        // If the element is already focused, these invocations have no effect
        setTimeout(() => inputRef.current?.focus(), 1);
      }}
    >
      <SvgHash width={17} height={17} />
    </Button>
  );
}
