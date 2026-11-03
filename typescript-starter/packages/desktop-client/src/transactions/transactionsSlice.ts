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

import type { TransactionEntity } from '@actual-app/core/types/models';
import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

import { resetApp } from '#app/appSlice';

const sliceName = 'transactions';

type TransactionsState = {
  newTransactions: Array<TransactionEntity['id']>;
  matchedTransactions: Array<TransactionEntity['id']>;
  lastTransaction: TransactionEntity | null;
};

const initialState: TransactionsState = {
  newTransactions: [],
  matchedTransactions: [],
  lastTransaction: null,
};

type SetNewTransactionsPayload = {
  newTransactions: Array<TransactionEntity['id']>;
  matchedTransactions: Array<TransactionEntity['id']>;
};

type UpdateNewTransactionsPayload = {
  id: TransactionEntity['id'];
};

type SetLastTransactionPayload = {
  transaction: TransactionEntity;
};

const transactionsSlice = createSlice({
  name: sliceName,
  initialState,
  reducers: {
    setNewTransactions(
      state,
      action: PayloadAction<SetNewTransactionsPayload>,
    ) {
      state.newTransactions = action.payload.newTransactions
        ? [...state.newTransactions, ...action.payload.newTransactions]
        : state.newTransactions;

      state.matchedTransactions = action.payload.matchedTransactions
        ? [...state.matchedTransactions, ...action.payload.matchedTransactions]
        : state.matchedTransactions;
    },
    updateNewTransactions(
      state,
      action: PayloadAction<UpdateNewTransactionsPayload>,
    ) {
      state.newTransactions = state.newTransactions.filter(
        id => id !== action.payload.id,
      );
      state.matchedTransactions = state.matchedTransactions.filter(
        id => id !== action.payload.id,
      );
    },
    setLastTransaction(
      state,
      action: PayloadAction<SetLastTransactionPayload>,
    ) {
      state.lastTransaction = action.payload.transaction;
    },
  },
  extraReducers: builder => {
    builder.addCase(resetApp, () => initialState);
  },
});

export const { name, reducer, getInitialState } = transactionsSlice;
export const actions = {
  ...transactionsSlice.actions,
};

export const { setNewTransactions, updateNewTransactions, setLastTransaction } =
  transactionsSlice.actions;
