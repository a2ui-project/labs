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

import { useCallback } from 'react';

import { popModal } from '#modals/modalsSlice';
import type { Modal } from '#modals/modalsSlice';
import { useDispatch, useSelector } from '#redux';

type ModalState = {
  onClose: () => void;
  modalStack: Modal[];
  activeModal?: string;
  isActive: (name: string) => boolean;
  isHidden: boolean;
};

export function useModalState(): ModalState {
  const modalStack = useSelector(state => state.modals.modalStack);
  const isHidden = useSelector(state => state.modals.isHidden);
  const dispatch = useDispatch();

  const popModalCallback = useCallback(() => {
    dispatch(popModal());
  }, [dispatch]);

  const lastModal = modalStack[modalStack.length - 1];
  const isActive = useCallback(
    (name: string) => {
      if (!lastModal || name === lastModal.name) {
        return true;
      }

      return false;
    },
    [lastModal],
  );

  return {
    onClose: popModalCallback,
    modalStack,
    activeModal: lastModal?.name,
    isActive,
    isHidden,
  };
}
