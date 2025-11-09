// TODO: Add your TypeScript type definitions here

// Example types:
export interface User {
  id: number;
  email: string;
  name: string;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  per_page: number;
}
