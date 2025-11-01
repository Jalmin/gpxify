/**
 * API service for backend communication
 */
import axios from 'axios';
import { GPXUploadResponse } from '@/types/gpx';

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
};

export default apiClient;
