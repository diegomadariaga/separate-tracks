import * as React from 'react';
import { listJobs, startJob, cancelJob, deleteJobAll, forceDeleteJob, getApiBase, QueueJobSummary } from '../lib/api.js';
import ConfirmModal from './ConfirmModal.js';
import { Button } from './ui/Button.js';
import { usePolling } from '../hooks/usePolling.js';

interface JobQueueProps {
  refreshMs?: number;
}

export const JobQueue: React.FC<JobQueueProps> = ({ refreshMs = 1200 }) => {
  const [jobs, setJobs] = React.useState<QueueJobSummary[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [confirmState, setConfirmState] = React.useState<{ open: boolean; jobId?: string; terminal?: boolean }>({ open: false });
  const [deleting, setDeleting] = React.useState(false);

  const fetchJobs = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await listJobs();
      setJobs(data);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  // SSE subscription replaces polling when available
  const sseRef = React.useRef<EventSource | null>(null);
  React.useEffect(() => {
    const base = getApiBase();
    const es = new EventSource(`${base}/youtube/stream`);
    sseRef.current = es;
    es.addEventListener('init', (e: MessageEvent) => {
      try { setJobs(JSON.parse(e.data)); } catch {}
    });
    es.addEventListener('job', (e: MessageEvent) => {
      try {
        const job = JSON.parse(e.data) as QueueJobSummary;
        setJobs(prev => {
          const map = new Map(prev.map(j => [j.id, j] as const));
          map.set(job.id, { ...map.get(job.id), ...job });
          return Array.from(map.values()).sort((a,b)=> b.createdAt - a.createdAt);
        });
      } catch {}
    });
    es.onerror = () => {
      // fallback to polling if SSE fails
      if (es.readyState === EventSource.CLOSED) {
        fetchJobs();
      }
    };
    return () => { es.close(); };
  }, [fetchJobs]);
  // Initial fetch in case SSE arrives late
  React.useEffect(() => { fetchJobs(); }, [fetchJobs]);

  const runJobAction = React.useCallback(async (id: string, fn: (id: string) => Promise<void>) => {
    await fn(id);
    fetchJobs();
  }, [fetchJobs]);

  const openDownload = React.useCallback((file: string) => {
    const url = `${getApiBase()}/youtube/download/${encodeURIComponent(file)}`;
    window.open(url, '_blank');
  }, []);

  return (
    <>
    <div style={styles.wrapper}>
      <h3 style={styles.heading}>Cola de trabajos</h3>
      {loading && jobs.length === 0 && <div style={styles.info}>Cargando jobs...</div>}
      {!loading && jobs.length === 0 && <div style={styles.info}>Sin trabajos en cola.</div>}
      <ul style={styles.list}>
        {jobs.map(job => {
          const percent = job.percent.toFixed(2);
          const isTerminal = TERMINAL_STATES.includes(job.state);
          const duration = job.durationSeconds ? formatDuration(job.durationSeconds) : undefined;
          return (
            <li key={job.id} style={styles.item}>
              <div style={styles.topRow}>
                <div style={styles.thumbAndTitle}>
                  {job.thumbnailUrl ? (
                    <img
                      src={job.thumbnailUrl}
                      alt={job.title || 'thumbnail'}
                      style={styles.thumb}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div style={styles.thumbPlaceholder} aria-hidden="true" />
                  )}
                  <div style={styles.titleBlock}>
                    <strong style={styles.titleText}>{job.title || job.file || '(cargando título...)'}</strong>
                    <div style={styles.metaLine}>
                      {job.author && <span style={styles.meta}>{job.author}</span>}
                      {job.author && duration && <span style={styles.dot}>•</span>}
                      {duration && <span style={styles.meta}>{duration}</span>}
                    </div>
                    <div style={styles.meta}>{job.state}{job.message ? ` · ${job.message}` : ''}</div>
                  </div>
                </div>
                <div style={styles.actions}>
                  {job.state === 'queued' && (
                    <Button
                      aria-label="Iniciar job"
                      size="sm"
                      variant="secondary"
                      onClick={() => runJobAction(job.id, startJob)}
                    >▶</Button>
                  )}
                  {ACTIVE_STATES.includes(job.state) && (
                    <Button
                      aria-label="Cancelar job"
                      size="sm"
                      variant="secondary"
                      onClick={() => runJobAction(job.id, cancelJob)}
                    >✕</Button>
                  )}
                  {job.hasFile && job.file && (
                    <Button
                      aria-label="Descargar archivo"
                      title="Descargar archivo"
                      size="sm"
                      variant="secondary"
                      onClick={() => openDownload(job.file!)}
                    >⬇</Button>
                  )}
                  <Button
                    aria-label={isTerminal ? 'Eliminar archivo y registro' : 'Cancelar y eliminar job'}
                    title={isTerminal ? 'Eliminar todo' : 'Cancelar y eliminar'}
                    size="sm"
                    variant="danger"
                    loading={deleting && confirmState.jobId === job.id}
                    disabled={deleting}
                    onClick={() => setConfirmState({ open: true, jobId: job.id, terminal: isTerminal })}
                  >🗑️</Button>
                </div>
              </div>
              <div style={styles.dualBarsWrapper}>
                <div style={styles.labelRow}><span style={styles.barLabel}>Descarga</span><span style={styles.barValue}>{(job.downloadPercent ?? (job.state==='downloading'? (job.percent*2):0)).toFixed(0)}% {renderEta(job.downloadEtaSeconds)}</span></div>
                <div style={styles.progressBarOuter} title="Progreso de descarga">
                  <div style={{ ...styles.progressBarInner, width: `${Math.min(100, (job.downloadPercent ?? (job.state==='downloading'? (job.percent*2):0))).toFixed(2)}%`, background: '#0ea5e9' }} />
                </div>
                <div style={styles.labelRow}><span style={styles.barLabel}>Conversión</span><span style={styles.barValue}>{(job.convertPercent ?? (job.state==='converting'? ((job.percent-50)*2):0)).toFixed(0)}% {renderEta(job.convertEtaSeconds)}</span></div>
                <div style={styles.progressBarOuter} title="Progreso de conversión">
                  <div style={{ ...styles.progressBarInner, width: `${Math.min(100, (job.convertPercent ?? (job.state==='converting'? ((job.percent-50)*2):0))).toFixed(2)}%`, background: '#6366f1' }} />
                </div>
                <div style={styles.labelRow}><span style={styles.barLabel}>Total</span><span style={styles.barValue}>{Math.min(100, job.percent).toFixed(0)}%</span></div>
                <div style={styles.progressBarOuter} title="Progreso total del job (descarga + conversión)">
                  <div style={{ ...styles.progressBarInner, width: `${Math.min(100, job.percent).toFixed(2)}%`, background: 'linear-gradient(90deg,#0ea5e9,#6366f1)' }} />
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
    <ConfirmModal
      open={confirmState.open}
      title={confirmState.terminal ? 'Eliminar archivo y registro' : 'Cancelar y eliminar job'}
      message={confirmState.terminal ? 'Esto eliminará definitivamente el archivo y el registro.\n¿Deseas continuar?' : 'El job está activo. Se cancelará y se eliminará el archivo (si existe) y el registro.\n¿Continuar?'}
      confirmText={confirmState.terminal ? 'Eliminar' : 'Cancelar y eliminar'}
      danger
      onCancel={() => setConfirmState({ open: false })}
      onConfirm={async () => {
        if (!confirmState.jobId) return;
        setDeleting(true);
        try {
          if (confirmState.terminal) await deleteJobAll(confirmState.jobId);
          else await forceDeleteJob(confirmState.jobId);
          await fetchJobs();
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error(e);
        } finally {
          setDeleting(false);
          setConfirmState({ open: false });
        }
      }}
    />
    </>
  );
};

// Append modal outside list rendering but inside wrapper root using fragment
// (Modify return to include modal)

// Utilities
const TERMINAL_STATES = ['done', 'error', 'canceled'];
const ACTIVE_STATES = ['downloading', 'converting', 'pending', 'queued'];

function renderEta(sec?: number) {
  if (sec == null || !Number.isFinite(sec)) return '';
  if (sec < 0) return '';
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m === 0) return `(${r}s)`;
  return `(${m}m${r.toString().padStart(2,'0')}s)`;
}

function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

const styles: Record<string, React.CSSProperties> = {
  wrapper: { width: '100%', boxSizing: 'border-box', margin: '0 auto', padding: '20px 24px', background: '#1e293b', borderRadius: 16, boxShadow: '0 4px 16px -4px rgba(0,0,0,0.5)', color: '#f1f5f9' },
  heading: { margin: '0 0 12px', fontSize: 20 },
  info: { fontSize: 14, opacity: 0.7 },
  list: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 12 },
  item: { background: '#0f172a', padding: '12px 14px', borderRadius: 10, display: 'flex', flexDirection: 'column', gap: 8 },
  topRow: { display: 'flex', justifyContent: 'space-between', gap: 12 },
  thumbAndTitle: { display: 'flex', gap: 12, minWidth: 0 },
  thumb: { width: 80, height: 45, objectFit: 'cover', borderRadius: 6, background: '#1e293b', flexShrink: 0 },
  thumbPlaceholder: { width: 80, height: 45, borderRadius: 6, background: 'linear-gradient(135deg,#1e293b,#0f172a)', opacity: 0.4, flexShrink: 0 },
  titleBlock: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  titleText: { display: 'block', fontSize: 14, lineHeight: 1.3, maxHeight: 36, overflow: 'hidden' },
  metaLine: { display: 'flex', gap: 4, alignItems: 'center', fontSize: 11, flexWrap: 'wrap', opacity: 0.85 },
  dot: { opacity: 0.6 },
  meta: { fontSize: 11, opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 },
  actions: { display: 'flex', gap: 6 },
  btn: { background: '#334155', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12 },
  progressBarOuter: { height: 6, background: '#334155', borderRadius: 4, overflow: 'hidden' },
  progressBarInner: { height: '100%', transition: 'width .5s ease' },
  dualBarsWrapper: { display: 'flex', flexDirection: 'column', gap: 4 },
  labelRow: { display: 'flex', justifyContent: 'space-between', fontSize: 10, opacity: 0.8 },
  barLabel: { fontWeight: 500 },
  barValue: { fontVariantNumeric: 'tabular-nums' },
  globalWrapper: { marginTop: 6, display: 'flex', flexDirection: 'column', gap: 4 },
  globalLabel: { fontSize: 10, opacity: 0.7 }
};

export default JobQueue;
