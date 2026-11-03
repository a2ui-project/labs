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

import React from 'react';
import type { ComponentProps } from 'react';

import type { CustomReportEntity } from '@actual-app/core/types/models';

import { useReports } from '#hooks/useReports';

import { Autocomplete } from './Autocomplete';
import { ReportList } from './ReportList';

type ReportAutocompleteProps = {
  embedded?: boolean;
} & ComponentProps<typeof Autocomplete<CustomReportEntity>>;

export function ReportAutocomplete({
  embedded,
  ...props
}: ReportAutocompleteProps) {
  const { data: reports = [] } = useReports();

  return (
    <Autocomplete
      strict
      highlightFirst
      embedded={embedded}
      suggestions={reports}
      renderItems={(items, getItemProps, highlightedIndex) => (
        <ReportList
          items={items}
          getItemProps={getItemProps}
          highlightedIndex={highlightedIndex}
          embedded={embedded}
        />
      )}
      {...props}
    />
  );
}
