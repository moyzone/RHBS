export const BASE_URL = "http://127.0.0.1:8000";
export const API_URL = `${BASE_URL}/api`;

type TokenData = { token: string, tenant_id: string, theme_color: string };

export function resolveTenantId(tenantId?: string): string {
  if (tenantId && tenantId !== 'undefined' && tenantId !== 'admin') return tenantId;
  if (typeof window !== 'undefined') {
    const hostname = window.location.hostname;
    const parts = hostname.split('.');
    if (parts.length > 1 && parts[0] !== 'localhost' && parts[0] !== '127' && parts[0] !== 'www') {
      return parts[0];
    }
  }
  return 'hotelflora';
}

/**
 * Cookie & Storage Token Helpers
 * Manages restopia_token in cookies (SameSite=Lax, Path=/, Max-Age=7 days) & localStorage.
 */
export function setAuthToken(token: string, tenantId?: string) {
  if (typeof window === 'undefined') return;
  const activeTenantId = resolveTenantId(tenantId);
  
  // Set in localStorage
  localStorage.setItem('restopia_token', token);
  localStorage.setItem('token', token);
  localStorage.setItem(`token_${activeTenantId}`, token);

  // Set in cookies (SameSite=Lax, Path=/, Max-Age=7 days / 604800s)
  document.cookie = `restopia_token=${encodeURIComponent(token)}; Path=/; Max-Age=604800; SameSite=Lax`;
}

export function clearAuthToken(tenantId?: string) {
  if (typeof window === 'undefined') return;
  const activeTenantId = resolveTenantId(tenantId);

  // Clear from localStorage
  localStorage.removeItem('restopia_token');
  localStorage.removeItem('token');
  localStorage.removeItem(`token_${activeTenantId}`);

  // Clear cookie
  document.cookie = `restopia_token=; Path=/; Max-Age=0; SameSite=Lax`;
}

export function getAuthToken(tenantId?: string): string | null {
  if (typeof window === 'undefined') return null;
  
  // 1. Check cookies for restopia_token
  const match = document.cookie.match(/(?:^|; )restopia_token=([^;]*)/);
  if (match && match[1]) {
    return decodeURIComponent(match[1]);
  }

  // 2. Fallback to localStorage
  const activeTenantId = resolveTenantId(tenantId);
  return (
    localStorage.getItem('restopia_token') ||
    localStorage.getItem(`token_${activeTenantId}`) ||
    localStorage.getItem('token') ||
    null
  );
}

// Fetch a quick mock dev token and cache it if no user token exists
let devTokenMap: Record<string, string> = {};
export async function getDevToken(tenantId: string): Promise<string> {
  const activeTenantId = resolveTenantId(tenantId);
  const storedToken = getAuthToken(activeTenantId);
  if (storedToken) return storedToken;
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

/**
 * Centralized API Client with Automatic Bearer Header & 401 Interception
 */
export async function fetchApi<T>(tenantId: string, endpoint: string, options?: RequestInit): Promise<T> {
  const activeTenantId = resolveTenantId(tenantId);
  const token = getAuthToken(activeTenantId) || (await getDevToken(activeTenantId));
  
  const headers = new Headers(options?.headers);
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!(options?.body instanceof FormData) && !headers.has('Content-Type') && options?.body) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  // Automatic 401 Interception (token expired or revoked)
  if (response.status === 401) {
    clearAuthToken(activeTenantId);
    if (typeof window !== 'undefined' && !window.location.pathname.endsWith('/login')) {
      const currentPath = window.location.pathname + window.location.search;
      const redirectUrl = `/${activeTenantId}/login?redirect=${encodeURIComponent(currentPath)}`;
      window.location.href = redirectUrl;
    }
    let errorMsg = "Unauthorized - Session expired";
    try {
      const errorData = await response.json();
      if (errorData.detail) errorMsg = errorData.detail;
    } catch (_) {}
    throw new Error(errorMsg);
  }

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

export interface TenantPublicMetadata {
  id: string;
  name: string;
  theme_color: string;
  logo_url?: string;
  business_type?: string;
  slogan?: string;
  short_name?: string;
}

export async function fetchTenantPublicMetadata(tenantId: string): Promise<TenantPublicMetadata> {
  const activeTenantId = resolveTenantId(tenantId);
  try {
    return await fetchPublicApi<TenantPublicMetadata>(`/public/tenant/${activeTenantId}`);
  } catch (err) {
    return {
      id: activeTenantId,
      name: activeTenantId === 'hotelflora' ? 'Hotel Flora' : activeTenantId.toUpperCase(),
      theme_color: '#4f46e5',
      logo_url: undefined,
      business_type: 'Hotel'
    };
  }
}

export async function loginTenant(tenantId: string, email: string, password: string): Promise<{ token: string; access_token: string; user: any }> {
  const activeTenantId = resolveTenantId(tenantId);
  const response = await fetch(`${API_URL}/${activeTenantId}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!response.ok) {
    let errorMsg = "Invalid email or password";
    try {
      const errData = await response.json();
      if (errData.detail) errorMsg = errData.detail;
    } catch (_) {}
    throw new Error(errorMsg);
  }

  const data = await response.json();
  const token = data.token || data.access_token;
  if (token) {
    setAuthToken(token, activeTenantId);
  }
  return data;
}
