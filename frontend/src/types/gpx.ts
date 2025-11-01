/**
 * TypeScript types for GPX data structures
 * Matches backend Pydantic models
 */

export interface Coordinate {
  lat: number;
  lon: number;
  elevation?: number;
  time?: string;
}

export interface TrackPoint {
  lat: number;
  lon: number;
  elevation?: number;
  distance: number; // Cumulative distance in meters
  time?: string;
}

export interface TrackStatistics {
  total_distance: number; // meters
  total_elevation_gain: number; // meters
  total_elevation_loss: number; // meters
  max_elevation?: number;
  min_elevation?: number;
  avg_elevation?: number;
  duration?: number; // seconds
  start_time?: string;
  end_time?: string;
}

export interface Track {
  name?: string;
  points: TrackPoint[];
  statistics: TrackStatistics;
}

export interface GPXData {
  filename: string;
  tracks: Track[];
  waypoints: Coordinate[];
}

export interface GPXUploadResponse {
  success: boolean;
  message: string;
  data?: GPXData;
  file_id?: string;
}

export interface SegmentAnalysis {
  start_km: number;
  end_km: number;
  distance: number;
  elevation_gain: number;
  elevation_loss: number;
  avg_slope: number;
  max_slope: number;
  segment_type: string;
}
