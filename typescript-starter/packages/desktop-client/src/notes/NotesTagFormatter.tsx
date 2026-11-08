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

import React, {Fragment} from 'react';

import {useResponsive} from '@actual-app/components/hooks/useResponsive';

import {DesktopLinkedNotes} from './DesktopLinkedNotes';
import {DesktopTaggedNotes} from './DesktopTaggedNotes';
import {parseNotes} from './linkParser';
import {MobileLinkedNotes} from './MobileLinkedNotes';
import {MobileTaggedNotes} from './MobileTaggedNotes';

type NotesTagFormatterProps = {
  notes: string;
  onNotesTagClick?: (tag: string) => void;
};

export function NotesTagFormatter({notes, onNotesTagClick}: NotesTagFormatterProps) {
  const {isNarrowWidth} = useResponsive();

  const segments = parseNotes(notes);

  return (
    <>
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const nextSegment = segments[index + 1];
        // Add separator (space) after segment if next segment doesn't start with whitespace
        const separator =
          isLast || (nextSegment?.type === 'text' && /^\s/.test(nextSegment.content)) ? '' : ' ';

        switch (segment.type) {
          case 'text':
            return <Fragment key={index}>{segment.content}</Fragment>;

          case 'tag':
            if (isNarrowWidth) {
              return (
                <MobileTaggedNotes
                  key={index}
                  content={segment.content}
                  tag={segment.tag}
                  separator={separator}
                />
              );
            }
            return (
              <DesktopTaggedNotes
                key={index}
                onPress={onNotesTagClick}
                content={segment.content}
                tag={segment.tag}
                separator={separator}
              />
            );

          case 'link':
            if (isNarrowWidth) {
              return (
                <MobileLinkedNotes
                  key={index}
                  displayText={segment.displayText}
                  url={segment.url}
                  separator={separator}
                  isFilePath={segment.isFilePath}
                />
              );
            }
            return (
              <DesktopLinkedNotes
                key={index}
                displayText={segment.displayText}
                url={segment.url}
                separator={separator}
                isFilePath={segment.isFilePath}
              />
            );

          default:
            return null;
        }
      })}
    </>
  );
}
