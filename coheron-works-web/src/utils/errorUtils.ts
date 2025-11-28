/**
 * Utility functions for handling API errors consistently across the application
 */

export interface ApiError extends Error {
  userMessage?: string;
  isNetworkError?: boolean;
  response?: {
    status: number;
    data?: {
      error?: string;
      message?: string;
      details?: string;
    };
  };
}

/**
 * Extract user-friendly error message from an API error
 */
export function getErrorMessage(error: any): string {
  // Use user-friendly message from apiService if available
  if (error.userMessage) {
    return error.userMessage;
  }
  
  // Try to extract from response data
  if (error.response?.data) {
    const data = error.response.data;
    if (data.error) return data.error;
    if (data.message) return data.message;
  }
  
  // Fallback to error message
  if (error.message) {
    return error.message;
  }
  
  // Default message
  return 'An unexpected error occurred. Please try again.';
}

/**
 * Check if error is a network/connection error
 */
export function isNetworkError(error: any): boolean {
  return error.isNetworkError || 
         !error.response || 
         error.code === 'ECONNREFUSED' ||
         error.code === 'ECONNABORTED' ||
         error.message?.includes('Network Error');
}

/**
 * Get helpful guidance for network errors
 */
export function getNetworkErrorGuidance(): string {
  return 'Make sure the backend server is running. Check the terminal or run: cd coheron-works-api && npm start';
}

