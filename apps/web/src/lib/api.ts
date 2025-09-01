export interface YoutubeMp3Response {
  file: string;
  sizeBytes: number;
  downloadUrl: string; // relative path from API base
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
