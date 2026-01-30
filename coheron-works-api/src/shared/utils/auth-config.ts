import crypto from 'crypto';

// --- JWT Configuration ---

export const ACCESS_TOKEN_EXPIRY = '1h';
export const REFRESH_TOKEN_EXPIRY = '7d';

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable must be set in production');
    }
    return 'dev-only-insecure-jwt-secret-do-not-use-in-production';
  }
  return secret;
}

// --- Account Lockout ---

export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_DURATION_MINUTES = 15;

// --- Password Policy ---

export const PASSWORD_HISTORY_COUNT = 5;

const PASSWORD_MIN_LENGTH = 12;

interface PasswordValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters long`);
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit');
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return { valid: errors.length === 0, errors };
}
