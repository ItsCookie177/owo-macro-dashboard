import type { ConfigInput } from '../../shared/schema';
import type { StateResponse } from '../../shared/types';

const TOKEN_KEY = 'owo-token';

function readToken(): string {
  const fromUrl = new URLSearchParams(window.location.search).get('token');
  if (fromUrl) {
    localStorage.setItem(TOKEN_KEY, fromUrl);
    return fromUrl;
  }
  return localStorage.getItem(TOKEN_KEY) ?? '';
}

export const token = readToken();

export const eventsUrl = `/api/events${
  token ? `?token=${encodeURIComponent(token)}` : ''
}`;

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const headers = new Headers(init?.headers);
  headers.set('Content-Type', 'application/json');
  if (token) headers.set('X-Token', token);
  const res = await fetch(path, { ...init, headers });
  const body: unknown = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof body === 'object' && body !== null && 'error' in body
        ? String((body as { error: unknown }).error)
        : `HTTP ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

export function getState(): Promise<StateResponse> {
  return api<StateResponse>('/api/state');
}

export function startSession(): Promise<{ ok: true }> {
  return api('/api/session/start', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

export function stopSession(mode: 'normal' | 'emergency'): Promise<{ ok: true }> {
  return api('/api/session/stop', {
    method: 'POST',
    body: JSON.stringify({ mode }),
  });
}

export function putConfig(config: ConfigInput): Promise<StateResponse['config']> {
  return api('/api/config', { method: 'PUT', body: JSON.stringify(config) });
}

export type Preset = {
  name: string;
  savedAt: string;
  config: ConfigInput;
};

export function getPresets(): Promise<Preset[]> {
  return api('/api/presets');
}

export function savePreset(name: string): Promise<Preset> {
  return api('/api/presets', { method: 'POST', body: JSON.stringify({ name }) });
}

export function deletePreset(name: string): Promise<{ ok: true }> {
  return api('/api/presets', {
    method: 'DELETE',
    body: JSON.stringify({ name }),
  });
}

export type ProbeResult = {
  ok: boolean;
  adapter: string;
  foreground?: boolean;
  visible?: boolean;
  dumpOk?: boolean;
  composerId?: string | null;
  hint?: string;
  reason?: string;
};

export function probe(): Promise<ProbeResult> {
  return api('/api/probe', { method: 'POST' });
}
