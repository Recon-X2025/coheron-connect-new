const API_URL = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api');

let csrfToken: string | null = null;

async function getCsrfToken(): Promise<string | null> {
  if (csrfToken) return csrfToken;
  try {
    const res = await fetch(`${API_URL}/csrf-token`, { credentials: 'include' });
    if (res.ok) {
      const data = await res.json();
      csrfToken = data.token;
      return csrfToken;
    }
  } catch {
    // CSRF endpoint may not exist in development
  }
  return null;
}

export function clearCsrfToken() {
  csrfToken = null;
}

export async function apiFetch(url: string, options?: RequestInit) {
  const token = localStorage.getItem('authToken') || '';
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options?.headers as Record<string, string>) || {}),
  };

  // Add CSRF token for mutating requests
  const method = (options?.method || 'GET').toUpperCase();
  if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
    const csrf = await getCsrfToken();
    if (csrf) {
      headers['x-csrf-token'] = csrf;
    }
  }

  const res = await fetch(url, { ...options, headers, credentials: 'include' });

  // If CSRF token expired, refresh and retry once
  if (res.status === 403) {
    const body = await res.clone().json().catch(() => ({}));
    if (body?.error?.includes?.('CSRF')) {
      csrfToken = null;
      const csrf = await getCsrfToken();
      if (csrf) {
        headers['x-csrf-token'] = csrf;
        const retry = await fetch(url, { ...options, headers, credentials: 'include' });
        if (!retry.ok) throw new Error(`API error: ${retry.status}`);
        return retry.json();
      }
    }
    throw new Error(`API error: 403`);
  }

  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
