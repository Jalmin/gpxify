import axios, { AxiosInstance } from 'axios';

// TODO: Update with your production API URL
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
const API_V1 = `${API_BASE_URL}/api/v1`;

/**
 * Centralized Axios instance with default configuration
 */
const apiClient: AxiosInstance = axios.create({
  baseURL: API_V1,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

/**
 * Request interceptor - Add auth token if available
 */
apiClient.interceptors.request.use(
  (config) => {
    // TODO: Uncomment and customize if using authentication
    // const token = localStorage.getItem('auth_token');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor - Global error handling
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    // TODO: Customize global error handling
    // Example: Redirect to login on 401
    // if (error.response?.status === 401) {
    //   window.location.href = '/login';
    // }
    return Promise.reject(error);
  }
);

/**
 * Example API endpoints
 * Organize by feature/domain
 */
export const exampleApi = {
  /**
   * Get example data
   */
  getExample: async (): Promise<{ message: string }> => {
    const response = await apiClient.get<{ message: string }>('/example');
    return response.data;
  },

  /**
   * Example POST request
   */
  createExample: async (data: { name: string }): Promise<{ id: string; name: string }> => {
    const response = await apiClient.post<{ id: string; name: string }>('/example', data);
    return response.data;
  },
};

// TODO: Add your API endpoints here
// Example:
// export const userApi = {
//   getUser: async (id: string) => { ... },
//   updateUser: async (id: string, data: UpdateUserData) => { ... },
// };

export default apiClient;
