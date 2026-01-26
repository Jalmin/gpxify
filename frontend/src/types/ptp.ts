/**
 * TypeScript types for PTP (Profile to Print) feature
 * Matches backend Pydantic models in models/race.py and models/ptp.py
 */

export type RavitoType = 'eau' | 'bouffe' | 'assistance';

export interface RaceAidStation {
  id?: string;
  name: string;
  distance_km: number;
  elevation?: number;
  type: RavitoType;
  services?: string[];
  cutoff_time?: string;
  position_order: number;
}

export interface Race {
  id: string;
  name: string;
  slug: string;
  description?: string;
  gpx_content: string;
  total_distance_km?: number;
  total_elevation_gain?: number;
  total_elevation_loss?: number;
  start_location_lat?: number;
  start_location_lon?: number;
  is_published: boolean;
  aid_stations: RaceAidStation[];
  created_at: string;
  updated_at: string;
}

export interface RaceCreate {
  name: string;
  slug: string;
  description?: string;
  gpx_content: string;
  is_published?: boolean;
  aid_stations?: Omit<RaceAidStation, 'id'>[];
}

export interface RaceUpdate {
  name?: string;
  slug?: string;
  description?: string;
  gpx_content?: string;
  is_published?: boolean;
  aid_stations?: Omit<RaceAidStation, 'id'>[];
}

export interface RaceListResponse {
  races: Race[];
  total: number;
}

export interface AdminLoginRequest {
  password: string;
}

export interface AdminLoginResponse {
  success: boolean;
  token: string;
  message: string;
}

export interface ParsedRavito {
  name: string;
  distance_km: number;
  elevation?: number;
  type: RavitoType;
  services?: string[];
  cutoff_time?: string;
}

export interface ParsedRavitoTable {
  ravitos: ParsedRavito[];
  warnings?: string[];
}

export interface SunTimes {
  sunrise: string;
  sunset: string;
  solar_noon: string;
  day_length: string;
  civil_twilight_begin: string;
  civil_twilight_end: string;
}

export interface GetSunTimesRequest {
  lat: number;
  lon: number;
  date: string; // YYYY-MM-DD
}

export interface GetSunTimesResponse {
  success: boolean;
  data?: SunTimes;
  error?: string;
}

// Runner configuration for roadbook
export interface RunnerConfig {
  departure_time: string; // ISO datetime
  flask_capacity: number; // 1, 2, or 3 flasks
  pace_override?: number; // km/h, optional override of Naismith
  notes: Record<string, string>; // aid_station_id -> note
}

// Computed passage time for display on profile
export interface PassageTime {
  aid_station_id: string;
  distance_km: number;
  estimated_arrival: string; // ISO datetime
  estimated_departure?: string;
  time_from_start_minutes: number;
}