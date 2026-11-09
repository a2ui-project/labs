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

import {useEffect, useState} from 'react';

import type {CatalogTheme} from '#style/customThemes';

const CATALOG_URL = `https://raw.githubusercontent.com/actualbudget/actual/${import.meta.env.REACT_APP_BRANCH || 'master'}/packages/desktop-client/src/data/customThemeCatalog.json`;

/**
 * Custom hook to fetch and manage the theme catalog from GitHub.
 */
export function useThemeCatalog() {
  const [data, setData] = useState<CatalogTheme[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCatalog = async () => {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(CATALOG_URL);

        if (!response.ok) {
          throw new Error(`Failed to fetch catalog: ${response.statusText}`);
        }

        const data = await response.json();

        // Validate that data is an array
        if (!Array.isArray(data)) {
          throw new Error('Invalid catalog format: expected an array');
        }

        setData(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load theme catalog');
      } finally {
        setIsLoading(false);
      }
    };

    void fetchCatalog();
  }, []);

  return {
    data,
    isLoading,
    error,
  };
}
