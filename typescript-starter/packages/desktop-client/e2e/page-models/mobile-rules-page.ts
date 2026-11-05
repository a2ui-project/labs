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

import type {Locator, Page} from '@playwright/test';

export class MobileRulesPage {
  readonly page: Page;
  readonly searchBox: Locator;
  readonly addButton: Locator;
  readonly rulesList: Locator;
  readonly emptyMessage: Locator;

  constructor(page: Page) {
    this.page = page;
    this.searchBox = page.getByPlaceholder('Filter rules…');
    this.addButton = page.getByRole('button', {name: 'Add new rule'});
    this.rulesList = page.getByRole('main');
    this.emptyMessage = page.getByText('No rules found');
  }

  async waitFor(options?: {
    state?: 'attached' | 'detached' | 'visible' | 'hidden';
    timeout?: number;
  }) {
    await this.rulesList.waitFor(options);
  }

  /**
   * Search for rules using the search box
   */
  async searchFor(text: string) {
    await this.searchBox.fill(text);
  }

  /**
   * Clear the search box
   */
  async clearSearch() {
    await this.searchBox.fill('');
  }

  /**
   * Get the nth rule item (0-based index)
   */
  getNthRule(index: number) {
    return this.getAllRules().nth(index);
  }

  /**
   * Get all visible rule items
   */
  getAllRules() {
    return this.page.getByRole('grid', {name: 'Rules'}).getByRole('row');
  }

  /**
   * Click on a rule to edit it
   */
  async clickRule(index: number) {
    const rule = this.getNthRule(index);
    await rule.click();
  }

  /**
   * Click the add button to create a new rule
   */
  async clickAddRule() {
    await this.addButton.click();
  }

  /**
   * Get the number of visible rules
   */
  async getRuleCount() {
    const rules = this.getAllRules();
    return await rules.count();
  }

  /**
   * Check if a rule contains specific text
   */
  async ruleContainsText(index: number, text: string) {
    const rule = this.getNthRule(index);
    const ruleText = await rule.textContent();
    return ruleText?.includes(text) || false;
  }

  /**
   * Get the stage badge text for a rule (PRE/DEFAULT/POST)
   */
  async getRuleStage(index: number) {
    const rule = this.getNthRule(index);
    const stageBadge = rule.getByTestId('rule-stage-badge');
    return await stageBadge.textContent();
  }
}
