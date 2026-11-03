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

import { send } from '@actual-app/core/platform/client/connection';
import type { LocationCoordinates } from '@actual-app/core/shared/location-utils';
import type {
  NearbyPayeeEntity,
  PayeeLocationEntity,
} from '@actual-app/core/types/models';

/**
 * Abstraction for geolocation functionality
 */
export type GeolocationAdapter = {
  getCurrentPosition(options?: PositionOptions): Promise<LocationCoordinates>;
};

/**
 * Abstraction for location-related API calls
 */
export type LocationApiClient = {
  saveLocation(
    payeeId: string,
    coordinates: LocationCoordinates,
  ): Promise<string>;
  getLocations(payeeId: string): Promise<PayeeLocationEntity[]>;
  deleteLocation(locationId: string): Promise<void>;
  getNearbyPayees(
    coordinates: LocationCoordinates,
    maxDistance: number,
  ): Promise<NearbyPayeeEntity[]>;
};

/**
 * Browser implementation of geolocation using the Web Geolocation API
 */
export class BrowserGeolocationAdapter implements GeolocationAdapter {
  async getCurrentPosition(
    options: PositionOptions = {},
  ): Promise<LocationCoordinates> {
    if (!navigator.geolocation) {
      throw new Error('Geolocation is not supported by this browser');
    }

    const defaultOptions: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 15000, // 15 second timeout
      maximumAge: 60000, // Accept 1-minute-old cached position
    };

    const position = await new Promise<GeolocationPosition>(
      (resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          ...defaultOptions,
          ...options,
        });
      },
    );
    return {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
    };
  }
}

/**
 * Implementation using the existing send function for API calls
 */
export class SendApiLocationClient implements LocationApiClient {
  async saveLocation(
    payeeId: string,
    coordinates: LocationCoordinates,
  ): Promise<string> {
    return await send('payee-location-create', {
      payeeId,
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
    });
  }

  async getLocations(payeeId: string): Promise<PayeeLocationEntity[]> {
    return await send('payee-locations-get', { payeeId });
  }

  async deleteLocation(locationId: string): Promise<void> {
    await send('payee-location-delete', { id: locationId });
  }

  async getNearbyPayees(
    coordinates: LocationCoordinates,
    maxDistance: number,
  ): Promise<NearbyPayeeEntity[]> {
    const result = await send('payees-get-nearby', {
      latitude: coordinates.latitude,
      longitude: coordinates.longitude,
      maxDistance,
    });
    return result || [];
  }
}
