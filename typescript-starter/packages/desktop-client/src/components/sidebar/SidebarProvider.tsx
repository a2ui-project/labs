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
import React, {createContext, useContext, useMemo, useState} from 'react';
import type {Dispatch, ReactNode, SetStateAction} from 'react';

import {useResponsive} from '@actual-app/components/hooks/useResponsive';

import {useGlobalPref} from '#hooks/useGlobalPref';

type SidebarContextValue = {
  hidden: boolean;
  setHidden: Dispatch<SetStateAction<boolean>>;
  floating: boolean;
  alwaysFloats: boolean;
};

const SidebarContext = createContext<SidebarContextValue>(null);

type SidebarProviderProps = {
  children: ReactNode;
};

export function SidebarProvider({children}: SidebarProviderProps) {
  const [floatingSidebar] = useGlobalPref('floatingSidebar');
  const [hidden, setHidden] = useState(true);
  const {width} = useResponsive();
  const alwaysFloats = width < 668;
  const floating = floatingSidebar || alwaysFloats;

  return (
    <SidebarContext.Provider value={{hidden, setHidden, floating, alwaysFloats}}>
      {children}
    </SidebarContext.Provider>
  );
}

export function useSidebar() {
  const {hidden, setHidden, floating, alwaysFloats} = useContext(SidebarContext);

  return useMemo(
    () => ({hidden, setHidden, floating, alwaysFloats}),
    [hidden, setHidden, floating, alwaysFloats],
  );
}
