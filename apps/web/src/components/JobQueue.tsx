import * as React from 'react';
import { listJobs, startJob, cancelJob, deleteJobAll, forceDeleteJob, getApiBase, QueueJobSummary } from '../lib/api.js';
import ConfirmModal from './ConfirmModal.js';

interface JobQueueProps {
  refreshMs?: number;
}

export const JobQueue: React.FC<JobQueueProps> = ({ refreshMs = 1200 }) => {
  const [jobs, setJobs] = React.useState<QueueJobSummary[]>([]);
  const [loading, setLoading] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);
  const [confirmState, setConfirmState] = React.useState<{ open: boolean; jobId?: string; terminal?: boolean }>(() => ({ open: false }));
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

  React.useEffect(() => {
    fetchJobs();
    const tick = () => {
      fetchJobs();
      timerRef.current = window.setTimeout(tick, refreshMs);
    };
    timerRef.current = window.setTimeout(tick, refreshMs);
    return () => { if (timerRef.current) window.clearTimeout(timerRef.current); };
  }, [fetchJobs, refreshMs]);

  const action = async (id: string, fn: (id: string) => Promise<void>) => {
    await fn(id);
    fetchJobs();
  };

  const openDownload = (file: string) => {
    const url = `${getApiBase()}/youtube/download/${encodeURIComponent(file)}`;
    window.open(url, '_blank');
  };

  return (
    <>
    <div style={styles.wrapper}>
      <h3 style={styles.heading}>Cola de trabajos</h3>
      {loading && jobs.length === 0 && <div style={styles.info}>Cargando jobs...</div>}
      {jobs.length === 0 && !loading && <div style={styles.info}>Sin trabajos en cola.</div>}
      <ul style={styles.list}>
        {jobs.map(job => {
          const percent = job.percent.toFixed(2);
          const isTerminal = ['done','error','canceled'].includes(job.state);
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
                  {job.state === 'queued' && <button onClick={() => action(job.id, startJob)} style={styles.btn}>▶</button>}
                  {['downloading','converting','pending','queued'].includes(job.state) && (
                    <button onClick={() => action(job.id, cancelJob)} style={styles.btn}>✕</button>
                  )}
                  {job.hasFile && job.file && <button title="Descargar archivo" onClick={() => openDownload(job.file!)} style={styles.btn}>⬇</button>}
                  <button
                    title={isTerminal ? 'Eliminar todo' : 'Cancelar y eliminar'}
                    disabled={deleting}
                    onClick={() => setConfirmState({ open: true, jobId: job.id, terminal: isTerminal })}
                    style={{ ...styles.btn, background: '#991b1b', opacity: deleting ? 0.6 : 1, cursor: deleting ? 'not-allowed' : 'pointer' }}
                  >{deleting && confirmState.jobId === job.id ? '…' : '🗑️'}</button>
                </div>
              </div>
              <div style={styles.dualBarsWrapper}>
                <div style={styles.labelRow}>
                  <span style={styles.barLabel}>Progreso</span>
                  <span style={styles.barValue}>{Math.min(100, job.percent).toFixed(0)}%</span>
                </div>
                <div style={styles.progressBarOuter} title="Progreso total del job (descarga + conversión)">
                  <div style={{ ...styles.progressBarInner, width: `${Math.min(100, job.percent).toFixed(2)}%`, background: '#6366f1' }} />
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
          if (confirmState.terminal) {
            await deleteJobAll(confirmState.jobId);
          } else {
            await forceDeleteJob(confirmState.jobId);
          }
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

function formatDuration(totalSeconds: number) {
  if (!Number.isFinite(totalSeconds) || totalSeconds <= 0) return '00:00';
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  const pad = (n: number) => n.toString().padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

function colorForState(state: string) {
  switch (state) {
    case 'queued': return '#64748b';
    case 'pending': return '#6366f1';
    case 'downloading': return '#0ea5e9';
    case 'converting': return '#f59e0b';
    case 'done': return '#10b981';
    case 'error': return '#ef4444';
    case 'canceled': return '#94a3b8';
    default: return '#6366f1';
  }
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
