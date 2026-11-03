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

import type { MetadataPrefs } from '@actual-app/core/types/prefs';

import { savePrefs } from '#prefs/prefsSlice';
import { useDispatch, useSelector } from '#redux';

type SetMetadataPrefAction<K extends keyof MetadataPrefs> = (
  value: MetadataPrefs[K],
) => void;

export function useMetadataPref<K extends keyof MetadataPrefs>(
  prefName: K,
): [MetadataPrefs[K], SetMetadataPrefAction<K>] {
  const dispatch = useDispatch();
  const setLocalPref = useCallback<SetMetadataPrefAction<K>>(
    value => {
      void dispatch(savePrefs({ prefs: { [prefName]: value } }));
    },
    [prefName, dispatch],
  );
  const localPref = useSelector(state => state.prefs.local?.[prefName]);

  return [localPref, setLocalPref];
}
