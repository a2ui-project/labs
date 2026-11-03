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

import React, { createContext, useContext } from 'react';
import type { ReactNode } from 'react';

import { useServerURL } from '#components/ServerContext';
import { useSelector } from '#redux';

import type { Permissions } from './types';

type AuthContextType = {
  hasPermission: (permission?: Permissions) => boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

type AuthProviderProps = {
  children?: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const userData = useSelector(state => state.user.data);
  const serverUrl = useServerURL();

  const hasPermission = (permission?: Permissions) => {
    if (!permission) {
      return true;
    }

    return (
      !serverUrl ||
      userData?.permission?.toUpperCase() === permission?.toUpperCase()
    );
  };

  return (
    <AuthContext.Provider value={{ hasPermission }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
