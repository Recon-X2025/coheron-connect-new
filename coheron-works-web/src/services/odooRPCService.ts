/**
 * Odoo RPC Service
 * Handles communication with Odoo backend using XML-RPC or JSON-RPC
 */

import axios from 'axios';
import { getOdooConfig, getApiEndpoints } from '../config/odooConfig';
import { OdooAPIError, NetworkError, handleError } from './errorHandler';
import { retryWithBackoff } from './retryHandler';
import { getSession, saveSession, clearSession } from './sessionManager';
import type { OdooSession } from './sessionManager';

export interface RPCRequest {
  jsonrpc: string;
  method: string;
  params: any;
  id?: number;
}

export interface RPCResponse {
  jsonrpc: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id?: number;
}

class OdooRPCService {
  private config = getOdooConfig();
  private uid: number | null = null;

  /**
   * Initialize service with session if available
   */
  constructor() {
    const session = getSession();
    if (session) {
      this.uid = session.uid;
    }
  }

  /**
   * Authenticate with Odoo
   */
  async authenticate(username: string, password: string, database?: string): Promise<OdooSession> {
    const db = database || this.config.database;
    const endpoints = getApiEndpoints(this.config.url, this.config.protocol);

    try {
      if (this.config.protocol === 'jsonrpc') {
        return await this.authenticateJSONRPC(username, password, db, endpoints);
      } else {
        return await this.authenticateXMLRPC(username, password, db, endpoints);
      }
    } catch (error) {
      const handledError = handleError(error, 'authentication');
      throw new OdooAPIError(handledError.message, handledError.code, handledError.data);
    }
  }

  /**
   * Authenticate using JSON-RPC
   */
  private async authenticateJSONRPC(
    username: string,
    password: string,
    database: string,
    endpoints: { common: string; object: string }
  ): Promise<OdooSession> {
    const response = await axios.post<RPCResponse>(endpoints.common, {
      jsonrpc: '2.0',
      method: 'call',
      params: {
        service: 'common',
        method: 'authenticate',
        args: [database, username, password, {}],
      },
      id: Math.floor(Math.random() * 1000000),
    });

    if (response.data.error) {
      throw new OdooAPIError(
        response.data.error.message,
        response.data.error.code,
        response.data.error.data
      );
    }

    const uid = response.data.result;
    if (!uid || typeof uid !== 'number') {
      throw new OdooAPIError('Authentication failed: Invalid response', 0);
    }

    const session: OdooSession = {
      uid,
      sessionId: '', // JSON-RPC doesn't use session IDs
      username,
      database,
    };

    this.uid = uid;
    saveSession(session);

    return session;
  }

  /**
   * Authenticate using XML-RPC (fallback, requires xmlrpc library)
   */
  private async authenticateXMLRPC(
    _username: string,
    _password: string,
    _database: string,
    _endpoints: { common: string; object: string }
  ): Promise<OdooSession> {
    // XML-RPC implementation would go here
    // For now, we'll use a simplified approach with axios
    throw new Error('XML-RPC authentication not yet implemented. Please use JSON-RPC.');
  }

  /**
   * Execute RPC call
   */
  private async executeRPC(
    model: string,
    method: string,
    args: any[],
    kwargs: any = {}
  ): Promise<any> {
    if (!this.uid) {
      throw new OdooAPIError('Not authenticated. Please login first.', 401);
    }

    const endpoints = getApiEndpoints(this.config.url, this.config.protocol);
    const requestId = Math.floor(Math.random() * 1000000);

    try {
      const response = await retryWithBackoff(async () => {
        return await axios.post<RPCResponse>(
          endpoints.object,
          {
            jsonrpc: '2.0',
            method: 'call',
            params: {
              service: 'object',
              method: 'execute_kw',
              args: [this.config.database, this.uid, this.config.password || '', model, method, args, kwargs],
            },
            id: requestId,
          },
          {
            timeout: this.config.timeout,
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
      });

      if (response.data.error) {
        throw new OdooAPIError(
          response.data.error.message,
          response.data.error.code,
          response.data.error.data
        );
      }

      return response.data.result;
    } catch (error: any) {
      if (error.response?.status === 401 || error.code === 401) {
        // Session expired, clear it
        this.logout();
        throw new OdooAPIError('Session expired. Please login again.', 401);
      }

      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        throw new NetworkError('Request timeout. Please try again.');
      }

      if (!error.response) {
        throw new NetworkError('Network error. Please check your connection.');
      }

      const handledError = handleError(error, `RPC call: ${model}.${method}`);
      throw new OdooAPIError(handledError.message, handledError.code, handledError.data);
    }
  }

  /**
   * Search records
   */
  async search<T>(
    model: string,
    domain: any[] = [],
    fields: string[] = [],
    limit?: number,
    offset?: number
  ): Promise<T[]> {
    const args: any[] = [domain];
    const kwargs: any = {};

    if (fields.length > 0) {
      kwargs.context = { ...kwargs.context, fields };
    }

    if (limit !== undefined) {
      kwargs.limit = limit;
    }

    if (offset !== undefined) {
      kwargs.offset = offset;
    }

    const ids = await this.executeRPC(model, 'search', args, kwargs);
    
    if (ids.length === 0 || fields.length === 0) {
      return ids.map((id: number) => ({ id } as T));
    }

    // If fields specified, read the records
    return this.read<T>(model, ids, fields);
  }

  /**
   * Read records
   */
  async read<T>(model: string, ids: number[], fields: string[] = []): Promise<T[]> {
    if (ids.length === 0) {
      return [];
    }

    const result = await this.executeRPC(model, 'read', [ids], { fields });
    return result as T[];
  }

  /**
   * Create record
   */
  async create<T>(model: string, values: Partial<T>): Promise<number> {
    const result = await this.executeRPC(model, 'create', [values]);
    return result as number;
  }

  /**
   * Update records
   */
  async write(model: string, ids: number[], values: any): Promise<boolean> {
    if (ids.length === 0) {
      return true;
    }

    await this.executeRPC(model, 'write', [ids, values]);
    return true;
  }

  /**
   * Delete records
   */
  async unlink(model: string, ids: number[]): Promise<boolean> {
    if (ids.length === 0) {
      return true;
    }

    await this.executeRPC(model, 'unlink', [ids]);
    return true;
  }

  /**
   * Call model method
   */
  async call(model: string, method: string, args: any[] = [], kwargs: any = {}): Promise<any> {
    return this.executeRPC(model, method, args, kwargs);
  }

  /**
   * Logout and clear session
   */
  logout(): void {
    this.uid = null;
    clearSession();
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.uid !== null && getSession() !== null;
  }

  /**
   * Get current user ID
   */
  getUid(): number | null {
    return this.uid;
  }
}

// Export singleton instance
export const odooRPCService = new OdooRPCService();

