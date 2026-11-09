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

import type {Template} from '@actual-app/core/types/models/templates';

import type {DisplayTemplateType} from './constants';

type SET_TYPE = {
  type: 'set-type';
  payload: DisplayTemplateType;
};

type SET_TEMPLATE = {
  type: 'set-template';
  payload: Template;
};

type UPDATE_TEMPLATE = {
  type: 'update-template';
  payload: Partial<Template> & Pick<Template, 'type'>;
};

export const setType = (type: DisplayTemplateType): SET_TYPE => ({
  type: 'set-type' as const,
  payload: type,
});

export const setTemplate = (template: Template): SET_TEMPLATE => ({
  type: 'set-template' as const,
  payload: template,
});

export const updateTemplate = (
  template: Partial<Template> & Pick<Template, 'type'>,
): UPDATE_TEMPLATE => ({
  type: 'update-template' as const,
  payload: template,
});

export type Action = SET_TYPE | SET_TEMPLATE | UPDATE_TEMPLATE;
