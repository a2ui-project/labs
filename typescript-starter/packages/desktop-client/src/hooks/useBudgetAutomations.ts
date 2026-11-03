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

import { useEffect, useState } from 'react';

import { send } from '@actual-app/core/platform/client/connection';
import type { Template } from '@actual-app/core/types/models/templates';

export function useBudgetAutomations({
  categoryId,
  source,
  onLoaded,
}: {
  categoryId: string;
  source: 'notes' | 'ui';
  onLoaded: (automations: Record<string, Template[]>) => void;
}) {
  const [automations, setAutomations] = useState<Record<string, Template[]>>(
    {},
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function fetchAutomations() {
      setLoading(true);

      // notes based #template/#goal lines may have been edited since they were
      // last parsed into the DB. ui-managed categories own goal_def directly, so skip.
      if (source !== 'ui') {
        await send('budget/store-note-templates', [categoryId]);
      }

      const result = await send('budget/get-category-automations', categoryId);
      if (mounted) {
        setAutomations(result);
        onLoaded(result);
        setLoading(false);
      }
    }
    void fetchAutomations();
    return () => {
      mounted = false;
    };
  }, [categoryId, source, onLoaded]);

  return { automations, loading };
}
