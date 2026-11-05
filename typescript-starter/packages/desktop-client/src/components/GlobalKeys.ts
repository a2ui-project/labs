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

import {useEffect} from 'react';

import * as Platform from '@actual-app/core/shared/platform';

import {useNavigate} from '#hooks/useNavigate';

export function GlobalKeys() {
  const navigate = useNavigate();
  useEffect(() => {
    const handleKeys = (e: KeyboardEvent) => {
      if (Platform.isBrowser) {
        return;
      }

      if (e.metaKey) {
        switch (e.key) {
          case '1':
            void navigate('/budget');
            break;
          case '2':
            void navigate('/reports');
            break;
          case '3':
            void navigate('/accounts');
            break;
          case ',':
            if (Platform.OS === 'mac') {
              void navigate('/settings');
            }
            break;
          default:
        }
      }
    };

    document.addEventListener('keydown', handleKeys);

    return () => document.removeEventListener('keydown', handleKeys);
  }, [navigate]);

  return null;
}
