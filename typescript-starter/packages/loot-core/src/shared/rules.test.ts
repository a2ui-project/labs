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

import { describe, expect, it } from 'vitest';

import { getValidOps, isValidOp } from './rules';

describe('rules', () => {
  describe('isValidOp', () => {
    it('should return false for oneOf operation on notes field', () => {
      expect(isValidOp('notes', 'oneOf')).toBe(false);
    });

    it('should return false for notOneOf operation on notes field', () => {
      expect(isValidOp('notes', 'notOneOf')).toBe(false);
    });

    it('should return true for valid string operations on notes field', () => {
      expect(isValidOp('notes', 'is')).toBe(true);
      expect(isValidOp('notes', 'isNot')).toBe(true);
      expect(isValidOp('notes', 'contains')).toBe(true);
      expect(isValidOp('notes', 'doesNotContain')).toBe(true);
      expect(isValidOp('notes', 'matches')).toBe(true);
      expect(isValidOp('notes', 'hasTags')).toBe(true);
      expect(isValidOp('notes', 'hasAnyTag')).toBe(true);
    });

    it('should return true for oneOf operation on payee field', () => {
      expect(isValidOp('payee', 'oneOf')).toBe(true);
    });

    it('should return true for notOneOf operation on payee field', () => {
      expect(isValidOp('payee', 'notOneOf')).toBe(true);
    });
  });

  describe('getValidOps', () => {
    it('should not include oneOf and notOneOf for notes field', () => {
      const validOps = getValidOps('notes');
      expect(validOps).not.toContain('oneOf');
      expect(validOps).not.toContain('notOneOf');
    });

    it('should include other valid string operations for notes field', () => {
      const validOps = getValidOps('notes');
      expect(validOps).toContain('is');
      expect(validOps).toContain('isNot');
      expect(validOps).toContain('contains');
      expect(validOps).toContain('doesNotContain');
      expect(validOps).toContain('matches');
      expect(validOps).toContain('hasTags');
      expect(validOps).toContain('hasAnyTag');
    });

    it('should include oneOf and notOneOf for payee field', () => {
      const validOps = getValidOps('payee');
      expect(validOps).toContain('oneOf');
      expect(validOps).toContain('notOneOf');
    });
  });
});
