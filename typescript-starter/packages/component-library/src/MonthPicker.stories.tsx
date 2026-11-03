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

import { useState } from 'react';

import type { Meta, StoryObj } from '@storybook/react-vite';
import { fn } from 'storybook/test';

import { MonthPicker } from './MonthPicker';

const meta = {
  title: 'Components/MonthPicker',
  component: MonthPicker,
  parameters: {
    layout: 'centered',
  },
  args: {
    value: '2024-06',
    locale: 'en-US',
    labels: { previous: 'Previous', next: 'Next' },
    onChange: fn(),
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MonthPicker>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: args => {
    const [value, setValue] = useState(args.value);
    return <MonthPicker {...args} value={value} onChange={setValue} />;
  },
};

export const WithBounds: Story = {
  args: {
    minDate: '2023-04',
    maxDate: '2025-09',
  },
};

export const Empty: Story = {
  args: {
    value: '',
    placeholder: 'Select month',
  },
};
