/**
 * Session Manager
 * Handles Odoo session storage, retrieval, and management
 */

export interface OdooSession {
  uid: number;
  sessionId: string;
  username: string;
  database: string;
  expiresAt?: number;
}

const SESSION_STORAGE_KEY = 'erp_session';
const SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Save session to storage
 */
export function saveSession(session: OdooSession): void {
  const sessionWithExpiry = {
    ...session,
    expiresAt: Date.now() + SESSION_TIMEOUT,
  };
  try {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionWithExpiry));
  } catch (error) {
    console.error('Failed to save session:', error);
  }
}

/**
 * Get session from storage
 */
export function getSession(): OdooSession | null {
  try {
    const sessionData = sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!sessionData) {
      return null;
    }

    const session: OdooSession & { expiresAt?: number } = JSON.parse(sessionData);

    // Check if session has expired
    if (session.expiresAt && Date.now() > session.expiresAt) {
      clearSession();
      return null;
    }

    return session;
  } catch (error) {
    console.error('Failed to get session:', error);
    return null;
  }
}

/**
 * Clear session from storage
 */
export function clearSession(): void {
  try {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear session:', error);
  }
}

/**
 * Check if session is valid
 */
export function isSessionValid(): boolean {
  const session = getSession();
  return session !== null;
}

/**
 * Refresh session expiry
 */
export function refreshSession(): void {
  const session = getSession();
  if (session) {
    saveSession(session);
  }
}

