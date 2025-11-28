/**
 * Odoo Configuration Management
 * Handles environment variables and configuration for Odoo API connection
 */

export interface OdooConfig {
  url: string;
  database: string;
  username?: string;
  password?: string;
  protocol?: 'xmlrpc' | 'jsonrpc';
  timeout?: number;
}

/**
 * Get Odoo configuration from environment variables or defaults
 */
export function getOdooConfig(): OdooConfig {
  const url = import.meta.env.VITE_ODOO_URL || 'http://localhost:8069';
  const database = import.meta.env.VITE_ODOO_DATABASE || '';
  const protocol = (import.meta.env.VITE_ODOO_PROTOCOL || 'jsonrpc') as 'xmlrpc' | 'jsonrpc';
  const timeout = parseInt(import.meta.env.VITE_ODOO_TIMEOUT || '30000', 10);

  // Remove trailing slash from URL
  const cleanUrl = url.replace(/\/$/, '');

  return {
    url: cleanUrl,
    database,
    protocol,
    timeout,
  };
}

/**
 * Validate Odoo configuration
 */
export function validateConfig(config: OdooConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.url) {
    errors.push('Odoo URL is required');
  } else {
    try {
      new URL(config.url);
    } catch {
      errors.push('Odoo URL is invalid');
    }
  }

  if (!config.database) {
    errors.push('Database name is required');
  }

  if (config.protocol && !['xmlrpc', 'jsonrpc'].includes(config.protocol)) {
    errors.push('Protocol must be either "xmlrpc" or "jsonrpc"');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Get API endpoint URLs
 */
export function getApiEndpoints(baseUrl: string, protocol: 'xmlrpc' | 'jsonrpc' = 'jsonrpc') {
  if (protocol === 'jsonrpc') {
    return {
      common: `${baseUrl}/jsonrpc`,
      object: `${baseUrl}/jsonrpc`,
    };
  } else {
    return {
      common: `${baseUrl}/xmlrpc/2/common`,
      object: `${baseUrl}/xmlrpc/2/object`,
    };
  }
}

