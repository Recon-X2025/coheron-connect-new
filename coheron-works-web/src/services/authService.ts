/**
 * Authentication Service
 * Handles user authentication and session management
 */

import { odooRPCService } from './odooRPCService';
import type { OdooSession } from './sessionManager';
import { AuthenticationError, OdooAPIError } from './errorHandler';
import { getOdooConfig, validateConfig } from '../config/odooConfig';

export interface LoginCredentials {
  username: string;
  password: string;
  database?: string;
}

export interface AuthState {
  isAuthenticated: boolean;
  session: OdooSession | null;
  loading: boolean;
  error: string | null;
}

class AuthService {
  /**
   * Login with username and password
   */
  async login(credentials: LoginCredentials): Promise<OdooSession> {
    try {
      // Validate configuration
      const config = getOdooConfig();
      const validation = validateConfig(config);
      
      if (!validation.valid) {
        throw new AuthenticationError(
          `Configuration error: ${validation.errors.join(', ')}`
        );
      }

      // Use provided database or config database
      const database = credentials.database || config.database;

      if (!database) {
        throw new AuthenticationError('Database name is required');
      }

      // Authenticate with Odoo
      const session = await odooRPCService.authenticate(
        credentials.username,
        credentials.password,
        database
      );

      return session;
    } catch (error) {
      if (error instanceof OdooAPIError) {
        throw new AuthenticationError(error.message);
      }
      throw error;
    }
  }

  /**
   * Logout current user
   */
  async logout(): Promise<void> {
    try {
      odooRPCService.logout();
    } catch (error) {
      console.error('Logout error:', error);
      // Even if logout fails, clear local session
      odooRPCService.logout();
    }
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return odooRPCService.isAuthenticated();
  }

  /**
   * Get current session
   */
  getSession(): OdooSession | null {
    if (!this.isAuthenticated()) {
      return null;
    }

    // Session is stored in sessionManager, but we need to reconstruct it
    // from odooRPCService
    const uid = odooRPCService.getUid();
    if (!uid) {
      return null;
    }

    // We'll need to get the full session from storage
    // For now, return a basic session object
    return {
      uid,
      sessionId: '',
      username: '',
      database: getOdooConfig().database,
    };
  }

  /**
   * Refresh session (extend expiry)
   */
  async refreshSession(): Promise<boolean> {
    if (!this.isAuthenticated()) {
      return false;
    }

    // In a real implementation, you might call a refresh endpoint
    // For now, we just check if session is still valid
    return this.isAuthenticated();
  }
}

// Export singleton instance
export const authService = new AuthService();

