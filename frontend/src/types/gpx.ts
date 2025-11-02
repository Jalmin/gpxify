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

export interface ClimbSegment {
  start_km: number;
  end_km: number;
  distance_km: number;
  elevation_gain: number; // D+ in meters
  elevation_loss: number; // D- in meters
  avg_gradient: number; // percentage
}

export interface ExportSegmentRequest {
  track_points: TrackPoint[];
  start_km: number;
  end_km: number;
  track_name: string;
}

export interface MergeOptions {
  gap_threshold_seconds: number;
  interpolate_gaps: boolean;
  sort_by_time: boolean;
}

export interface GPXFileInput {
  filename: string;
  content: string;
}

export interface MergeGPXRequest {
  files: GPXFileInput[];
  options: MergeOptions;
  merged_track_name?: string;
}

export interface MergeGPXResponse {
  success: boolean;
  message: string;
  merged_gpx?: string;
  data?: GPXData;
  warnings: string[];
}

export interface AidStation {
  name: string;
  distance_km: number;
}

export interface AidStationSegment {
  from_station: string;
  to_station: string;
  start_km: number;
  end_km: number;
  distance_km: number;
  elevation_gain: number;
  elevation_loss: number;
  estimated_time_minutes?: number;
  avg_gradient: number;
}

export interface AidStationTableRequest {
  track_points: TrackPoint[];
  aid_stations: AidStation[];
  use_naismith: boolean;
  custom_pace_kmh?: number;
}

export interface AidStationTableResponse {
  success: boolean;
  message: string;
  segments: AidStationSegment[];
  total_distance_km: number;
  total_elevation_gain: number;
  total_elevation_loss: number;
  total_time_minutes?: number;
}

export interface SaveStateRequest {
  state_json: Record<string, any>;
}

export interface SaveStateResponse {
  success: boolean;
  share_id: string;
  url: string;
  expires_at: string;
}

export interface SharedStateResponse {
  success: boolean;
  share_id: string;
  state_json: Record<string, any>;
  created_at: string;
  view_count: number;
}
