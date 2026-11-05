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
import React from 'react';
import type {ComponentProps} from 'react';

import type {CategoryEntity} from '@actual-app/core/types/models';

import {DropHighlight, useDraggable, useDroppable} from '#components/sort';
import type {OnDragChangeCallback, OnDropCallback} from '#components/sort';
import {Row} from '#components/table';
import {useDragRef} from '#hooks/useDragRef';

import {RenderMonths} from './RenderMonths';
import {SidebarCategory} from './SidebarCategory';

import {useBudgetComponents} from '.';

type IncomeCategoryProps = {
  cat: CategoryEntity;
  isLast?: boolean;
  editingCell: {id: CategoryEntity['id']; cell: string} | null;
  onEditName: ComponentProps<typeof SidebarCategory>['onEditName'];
  onEditMonth?: (id: CategoryEntity['id'], month: string) => void;
  onSave: ComponentProps<typeof SidebarCategory>['onSave'];
  onDelete: ComponentProps<typeof SidebarCategory>['onDelete'];
  onDragChange: OnDragChangeCallback<CategoryEntity>;
  onBudgetAction: (month: string, action: string, arg: unknown) => void;
  onReorder: OnDropCallback;
  onShowActivity: (id: CategoryEntity['id'], month: string) => void;
};

export function IncomeCategory({
  cat,
  isLast,
  editingCell,
  onEditName,
  onEditMonth,
  onSave,
  onDelete,
  onDragChange,
  onBudgetAction,
  onReorder,
  onShowActivity,
}: IncomeCategoryProps) {
  const {dragRef} = useDraggable({
    type: 'income-category',
    onDragChange,
    item: cat,
    canDrag: editingCell === null,
  });
  const handleDragRef = useDragRef(dragRef);

  const {dropRef, dropPos} = useDroppable({
    types: 'income-category',
    id: cat.id,
    onDrop: onReorder,
  });

  const {IncomeCategoryComponent: MonthComponent} = useBudgetComponents();

  return (
    <Row
      innerRef={dropRef}
      collapsed
      style={{
        opacity: cat.hidden ? 0.5 : undefined,
      }}
    >
      <DropHighlight pos={dropPos} offset={{top: 1}} />

      <SidebarCategory
        innerRef={handleDragRef}
        category={cat}
        isLast={isLast}
        editing={editingCell && editingCell.cell === 'name' && editingCell.id === cat.id}
        onEditName={onEditName}
        onSave={onSave}
        onDelete={onDelete}
      />
      <RenderMonths>
        {({month}) => (
          <MonthComponent
            month={month}
            editing={editingCell && editingCell.id === cat.id && editingCell.cell === month}
            category={cat}
            isLast={isLast}
            onEdit={onEditMonth}
            onBudgetAction={onBudgetAction}
            onShowActivity={onShowActivity}
          />
        )}
      </RenderMonths>
    </Row>
  );
}
