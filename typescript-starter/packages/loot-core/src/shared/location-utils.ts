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

/**
 * Pure utility functions for location calculations and formatting.
 * These functions have no side effects and can be easily tested.
 */

const metersToFeet = 3.28084;

export type LocationCoordinates = {
  latitude: number;
  longitude: number;
};

/**
 * Calculate the distance between two geographic coordinates using the Haversine formula
 * @param pos1 First position coordinates
 * @param pos2 Second position coordinates
 * @returns Distance in meters
 */
export function calculateDistance(
  pos1: LocationCoordinates,
  pos2: LocationCoordinates,
): number {
  const R = 6371e3; // Earth's radius in meters
  const phi1 = (pos1.latitude * Math.PI) / 180;
  const phi2 = (pos2.latitude * Math.PI) / 180;
  const deltaPhi = ((pos2.latitude - pos1.latitude) * Math.PI) / 180;
  const deltaLambda = ((pos2.longitude - pos1.longitude) * Math.PI) / 180;

  const a =
    Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(deltaLambda / 2) *
      Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

/**
 * Format a distance in meters to a human-readable string
 * @param meters Distance in meters
 * @returns Formatted distance string
 */
export function formatDistance(meters: number): string {
  const distanceImperial = `${Math.round(meters * metersToFeet)}ft`;
  const distanceMetric = `${Math.round(meters)}m`;
  return `${distanceImperial} | ${distanceMetric}`;
}
