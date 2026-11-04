import { Capacitor } from '@capacitor/core';

// Live deployed Cloud Run backend endpoint for native APK communication
export const CLOUD_RUN_BACKEND_URL = 'https://digital-docufolio-backend-git-393681011941.europe-west1.run.app';

export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    const custom = localStorage.getItem('docufolio_custom_api_url');
    if (custom && custom.trim()) {
      return custom.trim().replace(/\/$/, '');
    }
  }

  // When running inside Android/iOS native APK container
  if (Capacitor.isNativePlatform()) {
    const envUrl = import.meta.env.VITE_BACKEND_URL;
    return (envUrl || "https://digital-docufolio-backend-git-393681011941.europe-west1.run.app").trim().replace(/\/$/, '');
  }

  // Running in web browser on the same host
  return '';
};

export const apiFetch = async (endpoint: string, options?: RequestInit): Promise<Response> => {
  const base = getApiBaseUrl();
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  const fullUrl = base ? `${base}${cleanEndpoint}` : cleanEndpoint;

  try {
    const res = await fetch(fullUrl, options);
    return res;
  } catch (err: any) {
    console.error(`API fetch error calling ${fullUrl}:`, err);
    throw new Error(
      `Network connection failed. Please check your internet connection or backend server status.`
    );
  }
};

export const checkAiBackendHealth = async (): Promise<{ ok: boolean; url: string; error?: string }> => {
  const url = getApiBaseUrl();
  try {
    const res = await apiFetch('/api/health');
    if (res.ok) {
      return { ok: true, url: url || 'Current Web Host' };
    }
    return { ok: false, url: url || 'Current Web Host', error: `Server status: ${res.status}` };
  } catch (err: any) {
    return { ok: false, url: url || 'Current Web Host', error: err?.message || 'Connection failed' };
  }
};
