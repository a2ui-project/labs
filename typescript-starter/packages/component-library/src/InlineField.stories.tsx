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

import type { Meta, StoryObj } from '@storybook/react-vite';

import { InlineField } from './InlineField';
import { Input } from './Input';
import { View } from './View';

const meta = {
  title: 'Components/InlineField',
  component: InlineField,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof InlineField>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    label: 'Name',
    width: 300,
    children: <Input style={{ flex: 1 }} />,
  },
  parameters: {
    docs: {
      description: {
        story:
          'InlineField displays a label and input side-by-side in a horizontal layout.',
      },
    },
  },
};

export const WithCustomLabelWidth: Story = {
  args: {
    label: 'Email Address',
    labelWidth: 120,
    width: 400,
    children: <Input style={{ flex: 1 }} placeholder="user@example.com" />,
  },
  parameters: {
    docs: {
      description: {
        story:
          'Custom label width can be specified to accommodate longer labels.',
      },
    },
  },
};

export const MultipleFields: Story = {
  args: {
    label: 'First Name',
    width: 300,
  },
  render: args => (
    <View style={{ display: 'flex', flexDirection: 'column' }}>
      <InlineField {...args}>
        <Input style={{ flex: 1 }} />
      </InlineField>
      <InlineField label="Last Name" width={300}>
        <Input style={{ flex: 1 }} />
      </InlineField>
      <InlineField label="Email" width={300}>
        <Input style={{ flex: 1 }} type="email" />
      </InlineField>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Multiple InlineFields stack vertically with consistent label alignment.',
      },
    },
  },
};

export const WithPercentageWidth: Story = {
  args: {
    label: 'Description',
    width: '100%',
    children: <Input style={{ flex: 1 }} />,
  },
  decorators: [
    Story => (
      <View style={{ width: 400 }}>
        <Story />
      </View>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Width can be specified as a percentage for responsive layouts.',
      },
    },
  },
};
