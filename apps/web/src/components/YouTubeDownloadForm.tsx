import React, { useState } from 'react';
import { Button } from '@repo/ui';

const API_URL = (import.meta as any).env.VITE_API_URL || '';

export const YouTubeDownloadForm: React.FC = () => {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) return;
    setLoading(true); setError(null);
    try {
      const res = await fetch(API_URL + '/youtube', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      if (!res.ok) throw new Error('Error al solicitar descarga');
      setUrl('');
    } catch (e: any) {
      setError(e.message || 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="fade-in" style={{ marginBottom: 40, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
      <input
        type="text"
        placeholder="URL de YouTube"
        value={url}
        onChange={e => setUrl(e.target.value)}
        style={{ flex: '1 1 360px', padding: '14px 16px', fontSize: 16, borderRadius: 10, border: '1px solid var(--border)', background: 'var(--bg-alt)', color: 'var(--text)' }}
      />
      <Button size="lg" disabled={loading}>{loading ? 'Descargando...' : 'Añadir MP3'}</Button>
      {error && <div style={{ width: '100%', fontSize: 13, color: 'var(--danger)' }}>{error}</div>}
    </form>
  );
};
