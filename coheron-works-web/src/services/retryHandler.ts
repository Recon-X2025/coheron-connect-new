/**
 * Retry Handler
 * Implements exponential backoff retry logic for failed API requests
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  retryableErrors?: number[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  retryableErrors: [408, 429, 500, 502, 503, 504], // HTTP status codes to retry
};

/**
 * Check if error is retryable
 */
function isRetryableError(error: any, retryableErrors: number[]): boolean {
  // Network errors are always retryable
  if (error instanceof TypeError || error.name === 'NetworkError') {
    return true;
  }

  // Check HTTP status codes
  if (error?.response?.status) {
    return retryableErrors.includes(error.response.status);
  }

  // Check Odoo error codes (some are retryable)
  if (error?.code) {
    // Odoo doesn't typically use HTTP status codes, but we can check for specific error types
    return false; // Most Odoo errors are not retryable
  }

  return false;
}

/**
 * Calculate delay for retry attempt
 */
function calculateDelay(attempt: number, options: Required<RetryOptions>): number {
  const delay = options.initialDelay * Math.pow(options.backoffMultiplier, attempt);
  return Math.min(delay, options.maxDelay);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry if it's the last attempt
      if (attempt === opts.maxRetries) {
        break;
      }

      // Don't retry if error is not retryable
      if (!isRetryableError(error, opts.retryableErrors)) {
        throw error;
      }

      // Calculate delay and wait
      const delay = calculateDelay(attempt, opts);
      console.warn(`Retry attempt ${attempt + 1}/${opts.maxRetries} after ${delay}ms`, error);
      await sleep(delay);
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Retry decorator for async functions
 */
export function withRetry<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  options?: RetryOptions
): T {
  return ((...args: any[]) => {
    return retryWithBackoff(() => fn(...args), options);
  }) as T;
}

