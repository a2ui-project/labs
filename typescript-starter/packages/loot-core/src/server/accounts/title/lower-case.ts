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

const conjunctions = [
  'for', //
  'and',
  'nor',
  'but',
  'or',
  'yet',
  'so',
];

const articles = [
  'a', //
  'an',
  'the',
];

const prepositions = [
  'aboard',
  'about',
  'above',
  'across',
  'after',
  'against',
  'along',
  'amid',
  'among',
  'anti',
  'around',
  'as',
  'at',
  'before',
  'behind',
  'below',
  'beneath',
  'beside',
  'besides',
  'between',
  'beyond',
  'but',
  'by',
  'concerning',
  'considering',
  'despite',
  'down',
  'during',
  'except',
  'excepting',
  'excluding',
  'following',
  'for',
  'from',
  'in',
  'inside',
  'into',
  'like',
  'minus',
  'near',
  'of',
  'off',
  'on',
  'onto',
  'opposite',
  'over',
  'past',
  'per',
  'plus',
  'regarding',
  'round',
  'save',
  'since',
  'than',
  'through',
  'to',
  'toward',
  'towards',
  'under',
  'underneath',
  'unlike',
  'until',
  'up',
  'upon',
  'versus',
  'via',
  'with',
  'within',
  'without',
];

export const lowerCaseSet = new Set([...conjunctions, ...articles, ...prepositions]);
