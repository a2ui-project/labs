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

import * as yjs from 'yjs';

/** JSON primitive value stored in an A2UI DataModel or component spec. */
export type JsonPrimitive = string | number | boolean | null;

/** Recursive JSON value with zero loose types. */
export type JsonValue = JsonPrimitive | JsonObject | JsonArray;

/** JSON object keyed by string. */
export interface JsonObject {
  [key: string]: JsonValue;
}

/** JSON array of recursive JsonValues. */
export type JsonArray = JsonValue[];

/** Shared Yjs value stored inside `doc.getMap('data')` or `doc.getMap('components')`. */
export type YDataValue =
  | string
  | number
  | boolean
  | null
  | yjs.Map<YDataValue>
  | yjs.Array<YDataValue>
  | yjs.Text;

const FORBIDDEN_SEGMENTS = new Set(['__proto__', 'constructor', 'prototype']);

/** Type guard narrowing a `JsonValue | undefined` to a `JsonObject`. */
export function isJsonObject(val: JsonValue | undefined): val is JsonObject {
  return typeof val === 'object' && val !== null && !Array.isArray(val);
}

/** Deep structural equality check across `JsonValue` trees. */
export function jsonEquals(a: JsonValue | undefined, b: JsonValue | undefined): boolean {
  if (a === b) return true;
  if (a === undefined || b === undefined || a === null || b === null) {
    return false;
  }
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) {
      return false;
    }
    for (let i = 0; i < a.length; i++) {
      if (!jsonEquals(a[i], b[i])) return false;
    }
    return true;
  }
  if (isJsonObject(a) && isJsonObject(b)) {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    if (keysA.length !== keysB.length) return false;
    for (const k of keysA) {
      if (!Object.prototype.hasOwnProperty.call(b, k)) return false;
      if (!jsonEquals(a[k], b[k])) return false;
    }
    return true;
  }
  return false;
}

/** Deep-clones a `JsonValue` so A2UI `DataModel` never shares mutable references with snapshots. */
export function cloneJsonValue<T extends JsonValue>(val: T): T;
export function cloneJsonValue(val: JsonValue | undefined): JsonValue | undefined;
export function cloneJsonValue(val: JsonValue | undefined): JsonValue | undefined {
  if (val === undefined || val === null || typeof val !== 'object') {
    return val;
  }
  if (Array.isArray(val)) {
    return val.map(item => cloneJsonValue(item));
  }
  const out: JsonObject = {};
  for (const key of Object.keys(val)) {
    out[key] = cloneJsonValue(val[key]);
  }
  return out;
}

/** Normalizes an RFC 6901 JSON Pointer (`""` -> `"/"`, `"shared/x"` -> `"/shared/x"`). */
export function normalizePointer(path: string): string {
  const trimmed = path.trim();
  if (!trimmed || trimmed === '/') return '/';
  const withSlash = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return withSlash.replace(/\/+$/, '') || '/';
}

/** Parses an RFC 6901 JSON Pointer into unescaped path segments. */
export function parsePointerSegments(path: string): string[] {
  const norm = normalizePointer(path);
  if (norm === '/') return [];
  return norm
    .slice(1)
    .split('/')
    .map(seg => seg.replace(/~1/g, '/').replace(/~0/g, '~'))
    .filter(seg => !FORBIDDEN_SEGMENTS.has(seg));
}

/** Escapes a single segment for inclusion in an RFC 6901 JSON Pointer. */
export function escapePointerSegment(seg: string): string {
  return seg.replace(/~/g, '~0').replace(/\//g, '~1');
}

/** Reads a nested value at `pointer` from `root`. */
export function getJsonAtPointer(root: JsonObject, pointer: string): JsonValue | undefined {
  const segments = parsePointerSegments(pointer);
  let cur: JsonValue = root;
  for (const seg of segments) {
    if (Array.isArray(cur)) {
      const idx = Number(seg);
      if (!Number.isInteger(idx) || idx < 0 || idx >= cur.length) {
        return undefined;
      }
      cur = cur[idx];
    } else if (isJsonObject(cur)) {
      if (!Object.prototype.hasOwnProperty.call(cur, seg)) {
        return undefined;
      }
      cur = cur[seg];
    } else {
      return undefined;
    }
  }
  return cur;
}

/** Converts a `YDataValue` recursively into a plain `JsonValue`. */
export function yValueToJson(val: YDataValue | undefined): JsonValue | undefined {
  if (val === undefined) return undefined;
  if (
    val === null ||
    typeof val === 'string' ||
    typeof val === 'number' ||
    typeof val === 'boolean'
  ) {
    return val;
  }
  if (val instanceof yjs.Text) {
    return val.toJSON();
  }
  if (val instanceof yjs.Array) {
    const out: JsonArray = [];
    for (let i = 0; i < val.length; i++) {
      const converted = yValueToJson(val.get(i));
      if (converted !== undefined) {
        out.push(converted);
      }
    }
    return out;
  }
  if (val instanceof yjs.Map) {
    const out: JsonObject = {};
    for (const [k, child] of val.entries()) {
      const converted = yValueToJson(child);
      if (converted !== undefined) {
        out[k] = converted;
      }
    }
    return out;
  }
  return undefined;
}

function isHighSurrogate(code: number): boolean {
  return code >= 0xd800 && code <= 0xdbff;
}

function isLowSurrogate(code: number): boolean {
  return code >= 0xdc00 && code <= 0xdfff;
}

/**
 * Computes the minimal single-span `{index, deleteCount, insertText}` in UTF-16
 * code units between `oldStr` and `newStr`, keeping surrogate pairs intact.
 */
export function computeStringEditDiff(
  oldStr: string,
  newStr: string,
): {index: number; deleteCount: number; insertText: string} {
  if (oldStr === newStr) {
    return {index: 0, deleteCount: 0, insertText: ''};
  }
  let prefix = 0;
  const minLen = Math.min(oldStr.length, newStr.length);
  while (prefix < minLen && oldStr.charCodeAt(prefix) === newStr.charCodeAt(prefix)) {
    prefix++;
  }
  // Step back if prefix landed in the middle of a surrogate pair.
  if (
    prefix > 0 &&
    isHighSurrogate(oldStr.charCodeAt(prefix - 1)) &&
    ((prefix < oldStr.length && isLowSurrogate(oldStr.charCodeAt(prefix))) ||
      (prefix < newStr.length && isLowSurrogate(newStr.charCodeAt(prefix))))
  ) {
    prefix--;
  }

  let oldEnd = oldStr.length;
  let newEnd = newStr.length;
  while (
    oldEnd > prefix &&
    newEnd > prefix &&
    oldStr.charCodeAt(oldEnd - 1) === newStr.charCodeAt(newEnd - 1)
  ) {
    oldEnd--;
    newEnd--;
  }
  // Step forward if suffix split a surrogate pair.
  if (
    oldEnd < oldStr.length &&
    isLowSurrogate(oldStr.charCodeAt(oldEnd)) &&
    oldEnd > 0 &&
    isHighSurrogate(oldStr.charCodeAt(oldEnd - 1))
  ) {
    oldEnd++;
    newEnd++;
  }

  return {
    index: prefix,
    deleteCount: oldEnd - prefix,
    insertText: newStr.slice(prefix, newEnd),
  };
}

/**
 * Shifts a UTF-16 caret/selection offset from `oldStr` into `newStr` across a
 * remote edit so typing mid-string is never teleported to the end of `<input>`.
 */
export function transformIndexAcrossEdit(index: number, oldStr: string, newStr: string): number {
  const clamped = Math.max(0, Math.min(index, oldStr.length));
  if (oldStr === newStr) return clamped;
  const diff = computeStringEditDiff(oldStr, newStr);
  if (clamped <= diff.index) {
    return clamped;
  }
  const deletedEnd = diff.index + diff.deleteCount;
  if (clamped >= deletedEnd) {
    return Math.max(
      0,
      Math.min(newStr.length, clamped + diff.insertText.length - diff.deleteCount),
    );
  }
  return Math.max(0, Math.min(newStr.length, diff.index + diff.insertText.length));
}
