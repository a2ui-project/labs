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

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function parseBoolFlag(value: string, flagName: string): boolean {
  if (value !== 'true' && value !== 'false') {
    throw new Error(
      `Invalid ${flagName}: "${value}". Expected "true" or "false".`,
    );
  }
  return value === 'true';
}

export function parseIntFlag(value: string, flagName: string): number {
  const parsed = value.trim() === '' ? NaN : Number(value);
  if (!Number.isInteger(parsed)) {
    throw new Error(`Invalid ${flagName}: "${value}". Expected an integer.`);
  }
  return parsed;
}

export function parseNonNegativeIntFlag(
  value: string,
  flagName: string,
): number {
  const parsed = parseIntFlag(value, flagName);
  if (parsed < 0) {
    throw new Error(
      `Invalid ${flagName}: "${value}". Expected a non-negative integer.`,
    );
  }
  return parsed;
}

export function parseBoolEnv(
  raw: string | undefined,
  source: string,
): boolean | undefined {
  if (raw === undefined) return undefined;
  const lower = raw.toLowerCase();
  if (raw === '1' || lower === 'true') return true;
  if (raw === '0' || lower === 'false') return false;
  throw new Error(
    `Invalid ${source}: "${raw}". Expected "true", "false", "1", or "0".`,
  );
}
