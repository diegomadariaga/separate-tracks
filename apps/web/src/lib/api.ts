export interface YoutubeMp3Response {
  file: string;
  sizeBytes: number;
  downloadUrl: string; // relative path from API base
}

export interface StartJobResponse { jobId: string }
export interface ProgressResponse {
  id: string;
  state: 'pending' | 'downloading' | 'converting' | 'done' | 'error';
  percent: number;
  message?: string;
  stagePercent?: number;
  result?: { file: string; sizeBytes: number; downloadUrl: string };
  error?: string;
}

export const getApiBase = () => import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function requestYoutubeMp3(url: string, signal?: AbortSignal): Promise<YoutubeMp3Response> {
  const res = await fetch(`${getApiBase()}/youtube/mp3`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(text || `Error HTTP ${res.status}`);
  }
  return res.json();
}

export async function startYoutubeMp3Job(url: string, signal?: AbortSignal): Promise<StartJobResponse> {
  const res = await fetch(`${getApiBase()}/youtube/mp3/async`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal
  });
  if (!res.ok) throw new Error(`Error iniciando job (${res.status})`);
  return res.json();
}

export async function getJobProgress(id: string, signal?: AbortSignal): Promise<ProgressResponse> {
  const res = await fetch(`${getApiBase()}/youtube/progress/${id}`, { signal });
  if (!res.ok) throw new Error(`Error progreso (${res.status})`);
  return res.json();
}
