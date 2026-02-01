/**
 * Authentication Service
 * Handles user authentication and session management
 */

import { apiService } from './apiService';
import { AuthenticationError } from './errorHandler';

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface UserData {
  id: number;
  name: string;
  email: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  user: UserData | null;
  loading: boolean;
  error: string | null;
}

class AuthService {
  /**
   * Login with username and password
   */
  async login(credentials: LoginCredentials): Promise<UserData> {
    try {
      const result = await apiService.login(credentials.username, credentials.password);

      // Store user data if returned
      if (result.user) {
        localStorage.setItem('userData', JSON.stringify(result.user));
      }

      return result.user;
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new AuthenticationError(error.message);
      }
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    apiService.logout();
    localStorage.removeItem('userData');
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!localStorage.getItem('authToken');
  }

  /**
   * Get current user ID
   */
  getUserId(): number | null {
    const userData = this.getUserData();
    return userData?.id ?? null;
  }

  /**
   * Get stored user data
   */
  getUserData(): UserData | null {
    const raw = localStorage.getItem('userData');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as UserData;
    } catch {
      return null;
    }
  }

  /**
   * Refresh session (extend expiry)
   */
  async refreshSession(): Promise<boolean> {
    return this.isAuthenticated();
  }
}

// Export singleton instance
export const authService = new AuthService();

