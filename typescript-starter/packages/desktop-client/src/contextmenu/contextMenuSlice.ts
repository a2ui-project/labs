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

import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import type { ContextMenuItem } from './types';

const sliceName = 'contextMenu';

type ContextMenuState = {
  isOpen: boolean;
  position: { x: number; y: number };
  items: ContextMenuItem[];
};

const initialState: ContextMenuState = {
  isOpen: false,
  position: { x: 0, y: 0 },
  items: [],
};

const contextMenuSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    addItems(state, action: PayloadAction<ContextMenuItem[]>) {
      for (const item of action.payload) {
        if (typeof item === 'symbol' || !item.hidden) {
          state.items.push(item);
        }
      }

      state.items.sort((a, b) => {
        const orderA = typeof a === 'object' ? (a.order ?? 0) : 0;
        const orderB = typeof b === 'object' ? (b.order ?? 0) : 0;
        return orderA - orderB;
      });
      state.isOpen = !!state.items.length;
    },
    setContextMenuPosition(
      state,
      action: PayloadAction<{
        x: number;
        y: number;
      }>,
    ) {
      state.position = action.payload;
    },
    closeContextMenu(state) {
      state.isOpen = false;
      state.items = [];
    },
  },
});

export const { name, reducer, getInitialState } = contextMenuSlice;
export const { setContextMenuPosition, closeContextMenu, addItems } =
  contextMenuSlice.actions;
