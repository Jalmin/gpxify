/**
 * API service for backend communication
 */
import axios from 'axios';
import {
  GPXUploadResponse,
  ExportSegmentRequest,
  ClimbSegment,
  SaveStateRequest,
  SaveStateResponse,
  SharedStateResponse,
  MergeGPXRequest,
  MergeGPXResponse,
  AidStationTableRequest,
  AidStationTableResponse,
} from '@/types/gpx';
import {
  Race,
  RaceCreate,
  RaceUpdate,
  RaceListResponse,
  AdminLoginRequest,
  AdminLoginResponse,
  ParsedRavitoTable,
  GetSunTimesRequest,
  GetSunTimesResponse,
} from '@/types/ptp';

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_V1 = `${API_BASE_URL}/api/v1`;

const apiClient = axios.create({
  baseURL: API_V1,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const gpxApi = {
  /**
   * Upload a GPX file
   */
  uploadGPX: async (file: File): Promise<GPXUploadResponse> => {
    const formData = new FormData();
    formData.append('file', file);

    // Remove default Content-Type header to let browser set multipart/form-data with boundary
    const response = await apiClient.post<GPXUploadResponse>('/gpx/upload', formData, {
      headers: {
        'Content-Type': undefined, // Remove apiClient's default application/json
      },
    });

    return response.data;
  },

  /**
   * Test API connection
   */
  testConnection: async (): Promise<{ message: string; version: string }> => {
    const response = await apiClient.get('/gpx/test');
    return response.data;
  },

  /**
   * Export a segment of a GPX track as a downloadable .gpx file
   */
  exportSegment: async (request: ExportSegmentRequest): Promise<Blob> => {
    const response = await apiClient.post('/gpx/export-segment', request, {
      responseType: 'blob',
    });
    return response.data;
  },

  /**
   * Detect climb segments in a GPX track
   */
  detectClimbs: async (request: ExportSegmentRequest): Promise<ClimbSegment[]> => {
    const response = await apiClient.post<ClimbSegment[]>('/gpx/detect-climbs', request);
    return response.data;
  },

  /**
   * Merge multiple GPX files
   */
  mergeFiles: async (request: MergeGPXRequest): Promise<MergeGPXResponse> => {
    const response = await apiClient.post<MergeGPXResponse>('/gpx/merge', request);
    return response.data;
  },

  /**
   * Generate aid station table from track and stations
   */
  generateAidStationTable: async (request: AidStationTableRequest): Promise<AidStationTableResponse> => {
    const response = await apiClient.post<AidStationTableResponse>('/gpx/aid-station-table', request);
    return response.data;
  },
};

export const shareApi = {
  /**
   * Save application state and get shareable URL
   */
  saveState: async (state: Record<string, any>): Promise<SaveStateResponse> => {
    const request: SaveStateRequest = { state_json: state };
    const response = await apiClient.post<SaveStateResponse>('/share/save', request);
    return response.data;
  },

  /**
   * Get shared state by ID
   */
  getSharedState: async (shareId: string): Promise<SharedStateResponse> => {
    const response = await apiClient.get<SharedStateResponse>(`/share/${shareId}`);
    return response.data;
  },

  /**
   * Delete a shared state
   */
  deleteSharedState: async (shareId: string): Promise<{ success: boolean; message: string }> => {
    const response = await apiClient.delete(`/share/${shareId}`);
    return response.data;
  },
};

export const raceApi = {
  /**
   * Recover a race GPX from incomplete trace + official parcours
   */
  recover: async (
    incompleteGpx: File,
    completeGpx: File,
    officialTime: string,
    approxDistanceKm?: string
  ): Promise<Blob> => {
    const formData = new FormData();
    formData.append('incomplete_gpx', incompleteGpx);
    formData.append('complete_gpx', completeGpx);
    formData.append('official_time', officialTime);
    if (approxDistanceKm) {
      formData.append('approx_distance_km', approxDistanceKm);
    }

    const response = await apiClient.post('/race/recover', formData, {
      headers: { 'Content-Type': undefined },
      responseType: 'blob',
    });
    return response.data;
  },
};

export const contactApi = {
  /**
   * Send a contact message
   */
  send: async (data: { name: string; email: string; message: string }): Promise<void> => {
    await apiClient.post('/contact/send', data);
  },
};

// Admin token storage
let adminToken: string | null = null;

export const adminApi = {
  /**
   * Set the admin token for authenticated requests
   */
  setToken: (token: string | null) => {
    adminToken = token;
    if (token) {
      localStorage.setItem('admin_token', token);
    } else {
      localStorage.removeItem('admin_token');
    }
  },

  /**
   * Get the current admin token
   */
  getToken: (): string | null => {
    if (!adminToken) {
      adminToken = localStorage.getItem('admin_token');
    }
    return adminToken;
  },

  /**
   * Login as admin
   */
  login: async (password: string): Promise<AdminLoginResponse> => {
    const request: AdminLoginRequest = { password };
    const response = await apiClient.post<AdminLoginResponse>('/admin/login', request);
    if (response.data.success && response.data.token) {
      adminApi.setToken(response.data.token);
    }
    return response.data;
  },

  /**
   * Logout admin
   */
  logout: async (): Promise<void> => {
    const token = adminApi.getToken();
    if (token) {
      try {
        await apiClient.post('/admin/logout', null, {
          headers: { 'X-Admin-Token': token },
        });
      } catch {
        // Ignore logout errors
      }
    }
    adminApi.setToken(null);
  },

  /**
   * Get all races (admin view)
   */
  getRaces: async (): Promise<Race[]> => {
    const token = adminApi.getToken();
    const response = await apiClient.get<Race[]>('/admin/races', {
      headers: { 'X-Admin-Token': token },
    });
    return response.data;
  },

  /**
   * Get a single race by ID
   */
  getRace: async (id: string): Promise<Race> => {
    const token = adminApi.getToken();
    const response = await apiClient.get<Race>(`/admin/races/${id}`, {
      headers: { 'X-Admin-Token': token },
    });
    return response.data;
  },

  /**
   * Create a new race
   */
  createRace: async (data: RaceCreate): Promise<Race> => {
    const token = adminApi.getToken();
    const response = await apiClient.post<Race>('/admin/races', data, {
      headers: { 'X-Admin-Token': token },
    });
    return response.data;
  },

  /**
   * Update a race
   */
  updateRace: async (id: string, data: RaceUpdate): Promise<Race> => {
    const token = adminApi.getToken();
    const response = await apiClient.put<Race>(`/admin/races/${id}`, data, {
      headers: { 'X-Admin-Token': token },
    });
    return response.data;
  },

  /**
   * Delete a race
   */
  deleteRace: async (id: string): Promise<void> => {
    const token = adminApi.getToken();
    await apiClient.delete(`/admin/races/${id}`, {
      headers: { 'X-Admin-Token': token },
    });
  },

  /**
   * Parse ravito table text using Claude API
   */
  parseRavitoTable: async (tableText: string): Promise<ParsedRavitoTable> => {
    const token = adminApi.getToken();
    const response = await apiClient.post<ParsedRavitoTable>(
      '/admin/parse-ravito-table',
      { raw_text: tableText },
      { headers: { 'X-Admin-Token': token } }
    );
    return response.data;
  },
};

export const ptpApi = {
  /**
   * Get published races (public)
   */
  getPublishedRaces: async (): Promise<RaceListResponse> => {
    const response = await apiClient.get<RaceListResponse>('/races');
    return response.data;
  },

  /**
   * Get a race by slug (public)
   */
  getRaceBySlug: async (slug: string): Promise<Race> => {
    const response = await apiClient.get<Race>(`/races/${slug}`);
    return response.data;
  },

  /**
   * Get sun times for a location and date
   */
  getSunTimes: async (request: GetSunTimesRequest): Promise<GetSunTimesResponse> => {
    const response = await apiClient.post<GetSunTimesResponse>('/ptp/sun-times', request);
    return response.data;
  },
};

export default apiClient;
