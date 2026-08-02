export const BASE_URL = "http://127.0.0.1:8000";
export const API_URL = `${BASE_URL}/api`;

type TokenData = { token: string, tenant_id: string, theme_color: string };

export function resolveTenantId(tenantId?: string): string {
  if (tenantId && tenantId !== 'undefined') return tenantId;
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127' && parts[0] !== 'www') {
      return parts[0];
    }
  }
  return 'hotelflora';
}

// Fetch a quick mock dev token and cache it
let devTokenMap: Record<string, string> = {};
export async function getDevToken(tenantId: string): Promise<string> {
  const activeTenantId = resolveTenantId(tenantId);
  if (devTokenMap[activeTenantId]) return devTokenMap[activeTenantId];
  try {
    const res = await fetch(`${API_URL}/dev/token?tenant_id=${activeTenantId}`, {
      method: 'POST'
    });
    const data: TokenData = await res.json();
    devTokenMap[activeTenantId] = data.token;
    return data.token;
  } catch (err) {
    console.error("Failed to fetch dev token", err);
    return "mock_token";
  }
}

export async function fetchApi<T>(tenantId: string, endpoint: string, options?: RequestInit): Promise<T> {
  const activeTenantId = resolveTenantId(tenantId);
  const token = await getDevToken(activeTenantId);
  const headers = new Headers(options?.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (!(options?.body instanceof FormData) && !headers.has('Content-Type') && options?.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    let errorMsg = `API Error: ${response.statusText}`;
    try {
      const errorData = await response.json();
      if (errorData.detail) errorMsg = errorData.detail;
      else if (errorData.message) errorMsg = errorData.message;
    } catch (e) {
      // JSON parsing failed, use fallback message
    }
    throw new Error(errorMsg);
  }

  return response.json();
}

export async function fetchPublicApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers = new Headers(options?.headers);
  if (!(options?.body instanceof FormData) && !headers.has('Content-Type') && options?.body) {
    headers.set('Content-Type', 'application/json');
  }

  // Ensure no double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;

  const response = await fetch(`${API_URL}${cleanEndpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    throw new Error(`Public API error ${response.status}`);
  }

  return response.json();
}
