/**
 * Error Handler
 * Centralized error handling for API calls and application errors
 */
import * as Sentry from '@sentry/react';

export interface OdooError {
  code: number;
  message: string;
  data?: any;
  name?: string;
}

export class OdooAPIError extends Error {
  code: number;
  data?: any;

  constructor(message: string, code: number = 0, data?: any) {
    super(message);
    this.name = 'OdooAPIError';
    this.code = code;
    this.data = data;
    Object.setPrototypeOf(this, OdooAPIError.prototype);
  }
}

export class NetworkError extends Error {
  constructor(message: string = 'Network error occurred') {
    super(message);
    this.name = 'NetworkError';
    Object.setPrototypeOf(this, NetworkError.prototype);
  }
}

export class AuthenticationError extends Error {
  constructor(message: string = 'Authentication failed') {
    super(message);
    this.name = 'AuthenticationError';
    Object.setPrototypeOf(this, AuthenticationError.prototype);
  }
}

/**
 * Parse Odoo error response
 */
export function parseOdooError(error: any): OdooError {
  if (error instanceof OdooAPIError) {
    return {
      code: error.code,
      message: error.message,
      data: error.data,
      name: error.name,
    };
  }

  // Handle Odoo-specific error format
  if (error?.faultString) {
    return {
      code: error.faultCode || 0,
      message: error.faultString,
      data: error,
    };
  }

  // Handle standard error objects
  if (error?.message) {
    return {
      code: error.code || 0,
      message: error.message,
      data: error,
    };
  }

  // Fallback
  return {
    code: 0,
    message: String(error) || 'Unknown error occurred',
    data: error,
  };
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyMessage(error: OdooError | Error): string {
  if (error instanceof OdooAPIError) {
    // Map common Odoo error codes to user-friendly messages
    switch (error.code) {
      case 1:
        return 'Access denied. You do not have permission to perform this action.';
      case 2:
        return 'Missing required field. Please check your input.';
      case 3:
        return 'Validation error. Please check your input.';
      case 4:
        return 'Record not found.';
      case 5:
        return 'Access rights error. Please contact your administrator.';
      default:
        return error.message || 'An error occurred while processing your request.';
    }
  }

  if (error instanceof NetworkError) {
    return 'Network connection error. Please check your internet connection and try again.';
  }

  if (error instanceof AuthenticationError) {
    return 'Authentication failed. Please check your credentials and try again.';
  }

  if (error instanceof Error) {
    return error.message;
  }

  return 'An unexpected error occurred. Please try again.';
}

/**
 * Log error for monitoring
 */
export function logError(error: Error | OdooError, context?: string): void {
  const errorInfo = {
    message: error instanceof Error ? error.message : error.message,
    code: error instanceof OdooAPIError ? error.code : (error as OdooError).code,
    context,
    stack: error instanceof Error ? error.stack : undefined,
    timestamp: new Date().toISOString(),
  };

  // In production, send to Sentry
  if (import.meta.env.PROD) {
    Sentry.captureException(error instanceof Error ? error : new Error(error.message), {
      extra: { ...errorInfo },
    });
  } else {
    console.error('Error:', errorInfo);
  }
}

/**
 * Handle error and return appropriate response
 */
export function handleError(error: any, context?: string): OdooError {
  const parsedError = parseOdooError(error);
  logError(parsedError, context);
  return parsedError;
}

