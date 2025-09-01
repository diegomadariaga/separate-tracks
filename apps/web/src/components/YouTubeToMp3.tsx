import * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import { enqueueYoutubeMp3 } from '../lib/api.js';
import { Button } from './ui/Button.js';

interface DownloadState {
  status: 'idle' | 'loading' | 'queued' | 'error';
  message?: string;
  jobId?: string;
}

const YT_REGEX = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com\/watch\?v=|youtu\.be\/)[\w-]{11}(&.*)?$/i;

export const YouTubeToMp3 = () => {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<DownloadState>({ status: 'idle' });
  const abortRef = useRef<AbortController | null>(null);

  const validate = useCallback((value: string) => YT_REGEX.test(value.trim()), []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim()) {
      setState({ status: 'error', message: 'Ingresa una URL.' });
      return;
    }
    if (!validate(url)) {
      setState({ status: 'error', message: 'URL de YouTube no válida.' });
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setState({ status: 'loading', message: 'Encolando…' });
    try {
      const timeout = setTimeout(() => controller.abort(), 1000 * 60 * 2); // 2 min
      const { jobId } = await enqueueYoutubeMp3(url.trim(), controller.signal);
      clearTimeout(timeout);
      setState({ status: 'queued', message: 'Job en cola', jobId });
    } catch (err: any) {
      if (controller.signal.aborted) {
        setState({ status: 'idle', message: 'Cancelado.' });
      } else {
        setState({ status: 'error', message: err.message || 'Error inesperado.' });
      }
    } finally {
      abortRef.current = null;
    }
  };

  const reset = () => {
    setUrl('');
    setState({ status: 'idle' });
    if (abortRef.current) abortRef.current.abort();
  };

  // Descarga directa legacy eliminada (no usada actualmente)

  return (
    <div style={styles.card}>
  <h2 style={styles.title}>YouTube a MP3</h2>
  <p style={styles.subtitle}>Convierte y gestiona trabajos en la cola persistente</p>
      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="url"
          placeholder="https://www.youtube.com/watch?v=..."
          value={url}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUrl(e.target.value)}
          style={styles.input}
          disabled={state.status === 'loading'}
          aria-label="YouTube URL"
          required
        />
        <Button
          type="submit"
          variant="primary"
          size="md"
          loading={state.status === 'loading'}
          disabled={state.status === 'loading'}
        >
          Convertir
        </Button>
        {state.status === 'loading' && (
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => abortRef.current?.abort()}
          >Cancelar</Button>
        )}
        {state.status !== 'idle' && (
          <Button
            type="button"
            variant="secondary"
            size="md"
            disabled={state.status === 'loading'}
            onClick={reset}
          >Limpiar</Button>
        )}
      </form>
      {state.status === 'error' && (
        <div style={{ ...styles.alert, ...styles.error }}>{state.message}</div>
      )}
      {state.status === 'queued' && (
        <div style={{ ...styles.alert, ...styles.info }}>Job en cola (usa el panel para iniciar).</div>
      )}
      {state.status === 'loading' && (
        <div style={{ ...styles.alert, ...styles.info }}>{state.message}</div>
      )}
    </div>
    
  );
};

const styles: Record<string, React.CSSProperties> = {
  card: {
    maxWidth: 520,
    margin: '24px auto',
    padding: '24px 28px',
    borderRadius: 16,
    background: 'linear-gradient(135deg,#1e293b,#0f172a)',
    color: '#f1f5f9',
    boxShadow: '0 8px 24px -8px rgba(0,0,0,0.4)'
  },
  title: { margin: '0 0 4px', fontSize: 28, fontWeight: 600 },
  subtitle: { margin: '0 0 20px', opacity: 0.75 },
  form: { display: 'flex', gap: 12, flexWrap: 'wrap' },
  input: {
    flex: '1 1 320px',
    padding: '10px 14px',
    borderRadius: 8,
    border: '1px solid #334155',
    background: '#0f172a',
    color: '#f1f5f9',
    fontSize: 14
  },
  // button & secondary ahora se gestionan por componente Button
  alert: {
    marginTop: 18,
    padding: '12px 16px',
    borderRadius: 10,
    fontSize: 14,
    lineHeight: 1.4
  },
  error: { background: '#7f1d1d', color: '#fecaca' },
  success: { background: '#14532d', color: '#bbf7d0' },
  info: { background: '#1e3a8a', color: '#bfdbfe' },
  link: { color: '#93c5fd', textDecoration: 'underline', fontWeight: 500 }
};

export default YouTubeToMp3;
