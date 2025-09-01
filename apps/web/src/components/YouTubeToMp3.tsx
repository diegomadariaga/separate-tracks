import * as React from 'react';
import { useCallback, useRef, useState } from 'react';
import { startYoutubeMp3Job, getJobProgress, getApiBase, YoutubeMp3Response, ProgressResponse } from '../lib/api.js';

interface DownloadState {
  status: 'idle' | 'loading' | 'polling' | 'success' | 'error';
  message?: string;
  result?: YoutubeMp3Response;
  jobId?: string;
  percent?: number;
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
    setState({ status: 'loading', message: 'Iniciando conversión…' });
    try {
      const timeout = setTimeout(() => controller.abort(), 1000 * 60 * 2); // 2 min
      const { jobId } = await startYoutubeMp3Job(url.trim(), controller.signal);
      clearTimeout(timeout);
      setState({ status: 'polling', message: 'Preparando…', jobId, percent: 0 });
      pollJob(jobId);
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

  const pollJob = useCallback((jobId: string) => {
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      try {
        const progress: ProgressResponse = await getJobProgress(jobId);
        if (progress.state === 'done' && progress.result) {
          setState({ status: 'success', message: 'Conversión completa.', result: progress.result, jobId, percent: 100 });
          return;
        }
        if (progress.state === 'error') {
          setState({ status: 'error', message: progress.error || 'Error en conversión', jobId, percent: progress.percent });
          return;
        }
        setState(s => ({
          ...s,
            status: 'polling',
          jobId,
          percent: progress.percent,
          message: progress.message || s.message || 'Procesando…'
        }));
      } catch (e: any) {
        setState({ status: 'error', message: e.message || 'Error consultando progreso', jobId });
        return;
      }
      setTimeout(tick, 1000);
    };
    tick();
    return () => { cancelled = true; };
  }, []);

  const reset = () => {
    setUrl('');
    setState({ status: 'idle' });
    if (abortRef.current) abortRef.current.abort();
  };

  const handleDownload = async () => {
    if (!state.result) return;
    const fullUrl = `${getApiBase()}${state.result.downloadUrl}`;
    // Abrimos en nueva pestaña para desencadenar descarga
    window.open(fullUrl, '_blank');
  };

  return (
    <div style={styles.card}>
      <h2 style={styles.title}>YouTube a MP3</h2>
      <p style={styles.subtitle}>Solo interfaz (API pendiente)</p>
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
        <button
          type="submit"
          style={styles.button}
          disabled={state.status === 'loading'}
        >
          {state.status === 'loading' ? 'Convirtiendo...' : 'Convertir'}
        </button>
        {['loading','polling'].includes(state.status) && (
          <button type="button" onClick={() => abortRef.current?.abort()} style={styles.secondary}>
            Cancelar
          </button>
        )}
        {state.status !== 'idle' && (
          <button type="button" onClick={reset} style={styles.secondary} disabled={state.status === 'loading'}>
            Limpiar
          </button>
        )}
      </form>
      {state.status === 'error' && (
        <div style={{ ...styles.alert, ...styles.error }}>{state.message}</div>
      )}
      {state.status === 'success' && state.result && (
        <div style={{ ...styles.alert, ...styles.success }}>
          <span>{state.message}</span>
          <br />
          <strong>Archivo:</strong> {state.result.file}
          <br />
            <button onClick={handleDownload} style={styles.button}>Descargar MP3</button>
        </div>
      )}
      {['loading','polling'].includes(state.status) && (
        <div style={{ ...styles.alert, ...styles.info }}>
          {state.message}
          <div style={{ marginTop: 8, background: '#0f172a', borderRadius: 6, overflow: 'hidden', height: 10 }}>
            <div style={{ width: `${Math.min(100, Math.max(0, state.percent || 0)).toFixed(2)}%`, height: '100%', background: '#6366f1', transition: 'width 0.6s ease' }} />
          </div>
          <div style={{ marginTop: 4, fontSize: 12, opacity: 0.8 }}>{(state.percent || 0).toFixed(2)}%</div>
        </div>
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
  button: {
    padding: '10px 18px',
    borderRadius: 8,
    background: '#6366f1',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 600
  },
  secondary: {
    padding: '10px 14px',
    borderRadius: 8,
    background: '#334155',
    color: '#fff',
    border: 'none',
    cursor: 'pointer',
    fontWeight: 500
  },
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
