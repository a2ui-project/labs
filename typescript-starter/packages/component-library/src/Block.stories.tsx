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

import type {Meta, StoryObj} from '@storybook/react-vite';

import {Block} from './Block';
import {theme} from './theme';

const meta = {
  title: 'Components/Block',
  component: Block,
  parameters: {
    layout: 'centered',
  },
} satisfies Meta<typeof Block>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children: 'This is a Block component',
  },
  parameters: {
    docs: {
      description: {
        story: 'Block is a basic div wrapper that accepts Emotion CSS styles via the `style` prop.',
      },
    },
  },
  tags: ['autodocs'],
};

export const WithStyles: Story = {
  args: {
    children: 'Styled Block',
    style: {
      padding: 20,
      backgroundColor: theme.cardBackground,
      borderRadius: 8,
      border: `1px solid ${theme.cardBorder}`,
      color: theme.pageText,
    },
  },
};

export const WithFlexLayout: Story = {
  render: () => (
    <Block
      style={{
        display: 'flex',
        gap: 10,
        padding: 15,
        borderRadius: 4,
        color: theme.pageText,
      }}
    >
      <Block
        style={{
          padding: 10,
          backgroundColor: theme.cardBackground,
          borderRadius: 4,
          border: `1px solid ${theme.cardBorder}`,
        }}
      >
        Item 1
      </Block>
      <Block
        style={{
          padding: 10,
          backgroundColor: theme.cardBackground,
          borderRadius: 4,
          border: `1px solid ${theme.cardBorder}`,
        }}
      >
        Item 2
      </Block>
      <Block
        style={{
          padding: 10,
          backgroundColor: theme.cardBackground,
          borderRadius: 4,
          border: `1px solid ${theme.cardBorder}`,
        }}
      >
        Item 3
      </Block>
    </Block>
  ),
  parameters: {
    docs: {
      description: {
        story: 'Block components can be nested and styled with flexbox.',
      },
    },
  },
};

export const AsContainer: Story = {
  args: {
    children: 'Container Block',
    style: {
      width: 300,
      padding: 25,
      textAlign: 'center',
      backgroundColor: theme.cardBackground,
      border: `2px dashed ${theme.cardBorder}`,
      borderRadius: 8,
      color: theme.pageText,
    },
  },
};
