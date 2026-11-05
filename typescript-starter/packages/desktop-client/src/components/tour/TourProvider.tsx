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

import {createContext, useContext, useState} from 'react';
import type {ReactNode} from 'react';

import {useResponsive} from '@actual-app/components/hooks/useResponsive';

export type TourId = 'budget-tour';

export const TOUR_OFFER_NOTIFICATION_ID = 'tour-offer';

type TourContextValue = {
  activeTourId: TourId | null;
  startTour: (tourId?: TourId) => void;
  stopTour: () => void;
};

const TourContext = createContext<TourContextValue | null>(null);

type TourProviderProps = {
  children: ReactNode;
};

export function TourProvider({children}: TourProviderProps) {
  const {isNarrowWidth} = useResponsive();
  const [activeTourId, setActiveTourId] = useState<TourId | null>(null);

  const startTour = (tourId: TourId = 'budget-tour') => {
    if (isNarrowWidth) {
      return;
    }
    setActiveTourId(tourId);
  };

  const stopTour = () => {
    setActiveTourId(null);
  };

  return (
    <TourContext.Provider value={{activeTourId, startTour, stopTour}}>
      {children}
    </TourContext.Provider>
  );
}

export function useTour(): TourContextValue {
  const context = useContext(TourContext);
  if (!context) {
    throw new Error('useTour must be used within a TourProvider');
  }
  return context;
}
