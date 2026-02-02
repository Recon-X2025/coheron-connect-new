import axios, { type AxiosInstance } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api');

class ApiService {
  private axiosInstance: AxiosInstance;

  constructor() {
    this.axiosInstance = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Add auth token to requests
    this.axiosInstance.interceptors.request.use((config) => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Handle errors
    this.axiosInstance.interceptors.response.use(
      (response) => response,
      (error) => {
        // Handle network errors (backend not running or connection issues)
        if (!error.response) {
          if (error.code === 'ECONNREFUSED' || error.message?.includes('Network Error')) {
            error.userMessage = 'Cannot connect to server. Please ensure the backend server is running on http://localhost:3000';
            error.isNetworkError = true;
          } else if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
            error.userMessage = 'Request timed out. Please try again.';
            error.isNetworkError = true;
          } else {
            error.userMessage = 'Network error. Please check your connection and try again.';
            error.isNetworkError = true;
          }
        } else {
          // Handle HTTP errors
          const status = error.response.status;
          const data = error.response.data;
          
          if (status === 401) {
            // Don't redirect if already on login page or if this was the login request itself
            const isLoginRequest = error.config?.url?.includes('/auth/login') || error.config?.url?.includes('/auth/register');
            const isOnLoginPage = window.location.pathname === '/login' || window.location.pathname === '/signup';
            if (!isLoginRequest && !isOnLoginPage) {
              localStorage.removeItem('authToken');
              window.location.href = '/login';
            }
            error.userMessage = 'Session expired. Please login again.';
          } else if (status === 404) {
            error.userMessage = data?.error || 'Resource not found.';
          } else if (status === 400) {
            error.userMessage = data?.error || data?.message || 'Invalid request. Please check your input.';
          } else if (status === 403) {
            error.userMessage = 'You do not have permission to perform this action.';
          } else if (status === 500) {
            error.userMessage = data?.error || data?.message || 'Internal server error. Please try again later or contact support.';
            if (data?.details) {
              error.userMessage += ` Details: ${data.details}`;
            }
          } else {
            error.userMessage = data?.error || data?.message || `An error occurred (${status}). Please try again.`;
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  // Generic CRUD methods
  async get<T>(endpoint: string, params?: any): Promise<T[]> {
    const response = await this.axiosInstance.get<any>(endpoint, { params });
    const body = response.data;
    // Backend returns { data: [...], pagination: {...} } for list endpoints
    if (body && !Array.isArray(body) && Array.isArray(body.data)) {
      return body.data;
    }
    return body;
  }

  // Raw GET that preserves the full response body (including pagination metadata)
  async getRaw<T = any>(endpoint: string, params?: any): Promise<T> {
    const response = await this.axiosInstance.get<T>(endpoint, { params });
    return response.data;
  }

  async getById<T>(endpoint: string, id: number | string): Promise<T> {
    const response = await this.axiosInstance.get<T>(`${endpoint}/${id}`);
    return response.data;
  }

  async create<T>(endpoint: string, data: any): Promise<T> {
    const response = await this.axiosInstance.post<T>(endpoint, data);
    return response.data;
  }

  async update<T>(endpoint: string, id: number | string, data: any): Promise<T> {
    const response = await this.axiosInstance.put<T>(`${endpoint}/${id}`, data);
    return response.data;
  }

  async delete(endpoint: string, id: number | string): Promise<void> {
    await this.axiosInstance.delete(`${endpoint}/${id}`);
  }

  // Auth methods
  async login(email: string, password: string) {
    const response = await this.axiosInstance.post('/auth/login', { email, password });
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    return response.data;
  }

  async register(name: string, email: string, password: string) {
    const response = await this.axiosInstance.post('/auth/register', {
      name,
      email,
      password,
    });
    if (response.data.token) {
      localStorage.setItem('authToken', response.data.token);
    }
    return response.data;
  }

  logout() {
    localStorage.removeItem('authToken');
  }

  // Expose axiosInstance for custom requests
  getAxiosInstance(): AxiosInstance {
    return this.axiosInstance;
  }
}

export const apiService = new ApiService();

