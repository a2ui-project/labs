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

import {Paragraph} from './Paragraph';
import {View} from './View';

const meta = {
  title: 'Components/Paragraph',
  component: Paragraph,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Paragraph>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    children:
      'This is a paragraph of text. Paragraphs are used to display blocks of text content with proper line height and spacing.',
  },
  decorators: [
    Story => (
      <View style={{width: 400}}>
        <Story />
      </View>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'A basic paragraph with default styling and bottom margin.',
      },
    },
  },
};

export const MultipleParagraphs: Story = {
  render: () => (
    <View style={{width: 400}}>
      <Paragraph>
        This is the first paragraph. It has a bottom margin to create spacing between itself and the
        next paragraph.
      </Paragraph>
      <Paragraph>
        This is the second paragraph. Notice the consistent spacing between paragraphs which
        improves readability.
      </Paragraph>
      <Paragraph isLast>
        This is the last paragraph. It uses the isLast prop to remove the bottom margin since there
        is no following content.
      </Paragraph>
    </View>
  ),
  parameters: {
    docs: {
      description: {
        story:
          'Multiple paragraphs stack with consistent spacing. Use isLast on the final paragraph.',
      },
    },
  },
};

export const IsLast: Story = {
  args: {
    children: 'This paragraph has no bottom margin because isLast is true.',
    isLast: true,
  },
  decorators: [
    Story => (
      <View style={{width: 400, border: '1px dashed #ccc', padding: 10}}>
        <Story />
      </View>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          'When isLast is true, the bottom margin is removed. Useful for the last paragraph in a section.',
      },
    },
  },
};

export const WithCustomStyle: Story = {
  args: {
    children: 'This paragraph has custom styling applied.',
    style: {
      color: '#007bff',
      fontStyle: 'italic',
      fontSize: 18,
    },
  },
  decorators: [
    Story => (
      <View style={{width: 400}}>
        <Story />
      </View>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: 'Custom styles can be applied to paragraphs.',
      },
    },
  },
};

export const LongContent: Story = {
  args: {
    children:
      'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.',
  },
  decorators: [
    Story => (
      <View style={{width: 400}}>
        <Story />
      </View>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story:
          'Longer paragraphs wrap properly and maintain consistent line height for readability.',
      },
    },
  },
};
