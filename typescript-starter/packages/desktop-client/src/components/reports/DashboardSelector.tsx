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

import { useRef, useState } from 'react';
import { Dialog, DialogTrigger } from 'react-aria-components';
import { useTranslation } from 'react-i18next';

import { Button } from '@actual-app/components/button';
import { SvgExpandArrow } from '@actual-app/components/icons/v0';
import { Menu } from '@actual-app/components/menu';
import { Popover } from '@actual-app/components/popover';
import { View } from '@actual-app/components/view';
import type { DashboardPageEntity } from '@actual-app/core/types/models';

import { useNavigate } from '#hooks/useNavigate';
import { useCreateDashboardPageMutation } from '#reports/mutations';

type DashboardSelectorProps = {
  dashboards: readonly DashboardPageEntity[];
  currentDashboard: DashboardPageEntity;
};

export function DashboardSelector({
  dashboards,
  currentDashboard,
}: DashboardSelectorProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const triggerRef = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const createDashboardPageMutation = useCreateDashboardPageMutation();

  const handleAddDashboard = async () => {
    const defaultName = t('New dashboard');
    createDashboardPageMutation.mutate(
      { name: defaultName },
      {
        onSuccess: id => {
          void navigate(`/reports/${id}`);
        },
      },
    );
  };

  return (
    <DialogTrigger>
      <Button
        ref={triggerRef}
        onPress={() => setMenuOpen(true)}
        style={{
          flexGrow: 1,
          flexShrink: 1,
          flexBasis: 'auto',
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          minWidth: 0,
          display: 'flex',
          alignItems: 'center',
          gap: '5px',
        }}
      >
        <View
          style={{
            flexGrow: 1,
            flexShrink: 1,
            flexBasis: 'auto',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minWidth: 0,
            textAlign: 'center',
          }}
        >
          {currentDashboard.name}
        </View>
        <SvgExpandArrow
          width={7}
          height={7}
          style={{
            flexGrow: 0,
            flexShrink: 0,
            flexBasis: 'auto',
            marginLeft: 5,
          }}
        />
      </Button>

      {menuOpen && (
        <Popover
          triggerRef={triggerRef}
          isOpen
          onOpenChange={setMenuOpen}
          placement="bottom start"
        >
          <Dialog>
            <Menu
              slot="close"
              onMenuSelect={item => {
                if (item === 'add-new') {
                  void handleAddDashboard();
                } else {
                  void navigate(`/reports/${item}`);
                }
                setMenuOpen(false);
              }}
              items={[
                ...dashboards.map(dashboard => ({
                  name: dashboard.id,
                  text: dashboard.name,
                })),
                Menu.line,
                {
                  name: 'add-new',
                  text: t('Add new dashboard'),
                },
              ]}
            />
          </Dialog>
        </Popover>
      )}
    </DialogTrigger>
  );
}
