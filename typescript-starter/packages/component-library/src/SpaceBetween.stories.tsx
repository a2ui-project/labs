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

import { Button } from './Button';
import { SpaceBetween } from './SpaceBetween';
import { View } from './View';

const meta = {
  title: 'Components/SpaceBetween',
  component: SpaceBetween,
  parameters: {
    layout: 'centered',
  },
  args: {
    style: {
      display: 'flex',
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof SpaceBetween>;

export default meta;

type Story = StoryObj<typeof meta>;

const Box = ({ children }: { children: string }) => (
  <View
    style={{
      padding: '10px 20px',
      backgroundColor: '#e0e0e0',
      borderRadius: 4,
      display: 'flex',
    }}
  >
    {children}
  </View>
);

export const Horizontal: Story = {
  args: {
    direction: 'horizontal',
    children: (
      <>
        <Box>Item 1</Box>
        <Box>Item 2</Box>
        <Box>Item 3</Box>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story:
          'SpaceBetween lays out children horizontally with even spacing by default.',
      },
    },
  },
};

export const Vertical: Story = {
  args: {
    direction: 'vertical',
    children: (
      <>
        <Box>Item 1</Box>
        <Box>Item 2</Box>
        <Box>Item 3</Box>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Items laid out vertically with default spacing.',
      },
    },
  },
};

export const CustomGap: Story = {
  args: {
    direction: 'horizontal',
    gap: 30,
    children: (
      <>
        <Box>Gap 30</Box>
        <Box>Gap 30</Box>
        <Box>Gap 30</Box>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Custom gap between items.',
      },
    },
  },
};

export const NoWrap: Story = {
  args: {
    direction: 'horizontal',
    wrap: false,
    children: (
      <>
        <Box>No Wrap</Box>
        <Box>No Wrap</Box>
        <Box>No Wrap</Box>
        <Box>No Wrap</Box>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'Items will not wrap to the next line when wrap is false.',
      },
    },
  },
};

export const WithButtons: Story = {
  args: {
    direction: 'horizontal',
    gap: 10,
    children: (
      <>
        <Button variant="bare">Cancel</Button>
        <Button variant="primary">Save</Button>
      </>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: 'A common use case: spacing action buttons.',
      },
    },
  },
};
