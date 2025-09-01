// Central API / WS endpoint resolution.
// Strategy:
// 1. Allow explicit VITE_API_URL / VITE_WS_URL.
// 2. If absent or points to internal docker host (api), fall back to current origin.
// 3. Use relative paths for fetch when same-origin (simpler for nginx proxy).

const buildApi = (import.meta as any).env.VITE_API_URL as string | undefined;
const buildWs = (import.meta as any).env.VITE_WS_URL as string | undefined;

function resolveHttpBase() {
  if (typeof window === 'undefined') return buildApi || '';
  try {
    if (!buildApi) return '';// use relative
    const u = new URL(buildApi, window.location.origin);
    if (u.hostname === 'api' && window.location.hostname !== 'api') return '';// relative
    return u.origin === window.location.origin ? '' : u.origin; // '' => relative
  } catch {
    return '';
  }
}

export const API_BASE = resolveHttpBase(); // '' means same-origin relative
export const API_URL = (path: string) => `${API_BASE}${path}`;

function resolveWsUrl() {
  if (buildWs) return buildWs;
  if (typeof window === 'undefined') return '';
  const origin = API_BASE || window.location.origin;
  const proto = origin.startsWith('https') ? 'wss' : 'ws';
  // If API_BASE is '', use window.location host
  if (API_BASE === '') {
    return `${proto}://${window.location.host}/ws/status`;
  }
  return origin.replace(/^http(s?)/, proto) + '/ws/status';
}
export const WS_STATUS_URL = resolveWsUrl();
