/**
 * API service for backend communication
 */
import axios from 'axios';
import { GPXUploadResponse, ExportSegmentRequest, ClimbSegment } from '@/types/gpx';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
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

    const response = await apiClient.post<GPXUploadResponse>('/gpx/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
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
};

export default apiClient;
