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

export interface QueueJobSummary {
  id: string;
  state: string;
  percent: number;
  message?: string;
  file?: string;
  title?: string;
  durationSeconds?: number;
  hasFile: boolean;
  createdAt: number;
  updatedAt: number;
  downloadPercent?: number;
  convertPercent?: number;
  stagePercent?: number;
}

export async function enqueueYoutubeMp3(url: string, signal?: AbortSignal): Promise<{ jobId: string }> {
  const res = await fetch(`${getApiBase()}/youtube/mp3/enqueue`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url }),
    signal
  });
  if (!res.ok) throw new Error(`Error enqueue (${res.status})`);
  return res.json();
}

export async function listJobs(signal?: AbortSignal): Promise<QueueJobSummary[]> {
  const res = await fetch(`${getApiBase()}/youtube/jobs`, { signal });
  if (!res.ok) throw new Error(`Error list jobs (${res.status})`);
  return res.json();
}

export async function startJob(id: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/youtube/job/${id}/start`, { method: 'POST' });
  if (!res.ok) throw new Error('No se pudo iniciar job');
}

export async function cancelJob(id: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/youtube/job/${id}/cancel`, { method: 'POST' });
  if (!res.ok) throw new Error('No se pudo cancelar job');
}

export async function deleteJob(id: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/youtube/job/${id}`, { method: 'DELETE' });
  if (!res.ok) throw new Error('No se pudo eliminar job');
}

export async function deleteJobFile(id: string): Promise<void> {
  const res = await fetch(`${getApiBase()}/youtube/job/${id}/file`, { method: 'DELETE' });
  if (!res.ok) throw new Error('No se pudo eliminar archivo');
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
