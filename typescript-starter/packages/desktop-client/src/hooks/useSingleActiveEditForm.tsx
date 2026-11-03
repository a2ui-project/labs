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

// @ts-strict-ignore
import React, { createContext, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';

type ActiveEditCleanup = () => void;
type ActiveEditAction = () => void | ActiveEditCleanup;

type SingleActiveEditFormContextValue = {
  formName: string;
  editingField: string;
  onRequestActiveEdit: (
    field: string,
    action?: ActiveEditAction,
    options?: {
      clearActiveEditDelayMs?: number;
    },
  ) => void;
  onClearActiveEdit: (delayMs?: number) => void;
};

const SingleActiveEditFormContext = createContext<
  SingleActiveEditFormContextValue | undefined
>(undefined);

type SingleActiveEditFormProviderProps = {
  formName: string;
  children: ReactNode;
};

export function SingleActiveEditFormProvider({
  formName,
  children,
}: SingleActiveEditFormProviderProps) {
  const [editingField, setEditingField] = useState(null);
  const cleanupRef = useRef<ActiveEditCleanup | void>(null);

  const runCleanup = () => {
    const editCleanup = cleanupRef.current;
    if (typeof editCleanup === 'function') {
      editCleanup?.();
    }
    cleanupRef.current = null;
  };

  const runAction = (action: ActiveEditAction) => {
    cleanupRef.current = action?.();
  };

  const onClearActiveEdit = (delayMs?: number) => {
    setTimeout(() => {
      runCleanup();
      setEditingField(null);
    }, delayMs);
  };

  const onActiveEdit = (field: string, action: ActiveEditAction) => {
    runAction(action);
    setEditingField(field);
  };

  const onRequestActiveEdit = (
    field: string,
    action: ActiveEditAction,
    options: {
      clearActiveEditDelayMs?: number;
    },
  ) => {
    if (editingField === field) {
      // Already active.
      return;
    }

    if (editingField) {
      onClearActiveEdit(options?.clearActiveEditDelayMs);
    } else {
      onActiveEdit(field, action);
    }
  };

  return (
    <SingleActiveEditFormContext.Provider
      value={{
        formName,
        editingField,
        onRequestActiveEdit,
        onClearActiveEdit,
      }}
    >
      {children}
    </SingleActiveEditFormContext.Provider>
  );
}

type UseSingleActiveEditFormResult = {
  formName: SingleActiveEditFormContextValue['formName'];
  editingField?: SingleActiveEditFormContextValue['editingField'];
  onRequestActiveEdit: SingleActiveEditFormContextValue['onRequestActiveEdit'];
  onClearActiveEdit: SingleActiveEditFormContextValue['onClearActiveEdit'];
};

export function useSingleActiveEditForm(): UseSingleActiveEditFormResult | null {
  const context = useContext(SingleActiveEditFormContext);

  if (!context) {
    return null;
  }

  return {
    formName: context.formName,
    editingField: context.editingField,
    onRequestActiveEdit: context.onRequestActiveEdit,
    onClearActiveEdit: context.onClearActiveEdit,
  };
}
