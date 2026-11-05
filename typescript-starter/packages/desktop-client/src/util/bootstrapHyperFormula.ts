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

import {
  CustomFunctionsPlugin,
  customFunctionsTranslations,
} from '@actual-app/core/shared/formulas/customFunctions';
import {HyperFormula} from 'hyperformula';
import enUS from 'hyperformula/i18n/languages/enUS';

export function bootstrapHyperFormula() {
  if (!HyperFormula.getRegisteredLanguagesCodes().includes('enUS')) {
    HyperFormula.registerLanguage('enUS', enUS);
  }
  HyperFormula.registerFunctionPlugin(CustomFunctionsPlugin, customFunctionsTranslations);
}
