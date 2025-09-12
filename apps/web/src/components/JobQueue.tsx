import * as React from 'react';
import { listJobs, startJob, cancelJob, deleteJobAll, forceDeleteJob, getApiBase, QueueJobSummary, separateJob, getStems, StemsResponse } from '../lib/api.js';
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
  const [stemsState, setStemsState] = React.useState<Record<string, StemsResponse | undefined>>({});

  const fetchJobs = React.useCallback(async () => {
    setLoading(true);
    try {
      const data = await listJobs();
      setJobs(data);
    } catch (e) {
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
      try {
        type SSEItem = Partial<QueueJobSummary> & { result?: { fileName?: string } } & { hasFile?: boolean; file?: string; createdAt?: number; updatedAt?: number };
        const arr: SSEItem[] = JSON.parse(e.data);
        const normalized = arr.map((j) => {
          const base: QueueJobSummary = {
            id: j.id!,
            state: j.state || 'queued',
            percent: j.percent ?? 0,
            message: j.message,
            title: j.title,
            durationSeconds: j.durationSeconds,
            thumbnailUrl: j.thumbnailUrl,
            author: j.author,
            createdAt: j.createdAt ?? Date.now(),
            updatedAt: j.updatedAt ?? Date.now(),
            downloadPercent: j.downloadPercent,
            convertPercent: j.convertPercent,
            stagePercent: j.stagePercent,
            downloadEtaSeconds: j.downloadEtaSeconds,
            convertEtaSeconds: j.convertEtaSeconds,
            hasFile: false,
          } as QueueJobSummary;
          if (j?.result?.fileName) {
            base.file = j.result.fileName;
            base.hasFile = true;
          } else if (typeof j.hasFile === 'boolean') {
            base.hasFile = j.hasFile;
            base.file = j.file;
          }
          return base;
        }).sort((a,b)=> b.createdAt - a.createdAt);
        setJobs(normalized);
      } catch {}
    });
    es.addEventListener('job', (e: MessageEvent) => {
      try {
        type Incoming = Partial<QueueJobSummary> & { result?: { fileName?: string } } & { createdAt?: number; updatedAt?: number };
        const incoming: Incoming = JSON.parse(e.data);
        setJobs(prev => {
          if (!incoming.id) return prev;
          const map = new Map(prev.map(j => [j.id, j] as const));
          const prevJob = map.get(incoming.id) as Partial<QueueJobSummary> | undefined;
          const patch: Partial<QueueJobSummary> = {
            id: incoming.id,
            state: incoming.state,
            percent: typeof incoming.percent === 'number' ? incoming.percent : prevJob?.percent ?? 0,
            message: incoming.message ?? prevJob?.message,
            title: incoming.title ?? prevJob?.title,
            durationSeconds: incoming.durationSeconds ?? prevJob?.durationSeconds,
            thumbnailUrl: incoming.thumbnailUrl ?? prevJob?.thumbnailUrl,
            author: incoming.author ?? prevJob?.author,
            createdAt: prevJob?.createdAt ?? incoming.createdAt ?? Date.now(),
            updatedAt: incoming.updatedAt ?? Date.now(),
            downloadPercent: incoming.downloadPercent ?? prevJob?.downloadPercent,
            convertPercent: incoming.convertPercent ?? prevJob?.convertPercent,
            stagePercent: incoming.stagePercent ?? prevJob?.stagePercent,
            downloadEtaSeconds: incoming.downloadEtaSeconds ?? prevJob?.downloadEtaSeconds,
            convertEtaSeconds: incoming.convertEtaSeconds ?? prevJob?.convertEtaSeconds,
          } as Partial<QueueJobSummary>;
          // Normalizar archivo/hasFile desde result en SSE
          if (incoming?.result?.fileName) {
            patch.file = incoming.result.fileName;
            patch.hasFile = true;
          } else if (typeof prevJob?.hasFile === 'boolean') {
            patch.hasFile = prevJob.hasFile;
            patch.file = prevJob.file;
          }
          const next = { ...prevJob, ...patch } as QueueJobSummary;
          map.set(next.id, next);
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

  // Poll stems progress for jobs where separation has started
  usePolling(async () => {
    const ids = Object.keys(stemsState).filter(id => {
      const s = stemsState[id];
      return s && (s.sepState === 'queued' || s.sepState === 'processing');
    });
    if (ids.length === 0) return;
    await Promise.all(ids.map(async id => {
      try {
        const data = await getStems(id);
        setStemsState(prev => ({ ...prev, [id]: data }));
      } catch {}
    }));
  }, { interval: refreshMs, immediate: true, enabled: true });

  const handleSeparate = React.useCallback(async (id: string) => {
    try {
      setStemsState(prev => ({ ...prev, [id]: { sepState: 'queued', sepPercent: 0, stems: [] } as unknown as StemsResponse }));
      await separateJob(id);
      const data = await getStems(id);
      setStemsState(prev => ({ ...prev, [id]: data }));
    } catch (e) {
      console.error(e);
      const errState: StemsResponse = { sepState: 'error', sepPercent: 100, sepError: (e as Error).message, sepMessage: 'Error', stems: [] } as StemsResponse;
      setStemsState(prev => ({ ...prev, [id]: errState }));
    }
  }, []);

  return (
    <>
    <div style={styles.wrapper}>
      <h3 style={styles.heading}>Cola de trabajos</h3>
      {loading && jobs.length === 0 && <div style={styles.info}>Cargando jobs...</div>}
      {!loading && jobs.length === 0 && <div style={styles.info}>Sin trabajos en cola.</div>}
      <ul style={styles.list}>
        {jobs.map(job => {
          const isTerminal = TERMINAL_STATES.includes(job.state);
          const duration = job.durationSeconds ? formatDuration(job.durationSeconds) : undefined;
          const stems = stemsState[job.id];
          const sepInProgress = !!stems && (stems.sepState === 'queued' || stems.sepState === 'processing');
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
                  {(job.state === 'done' || job.hasFile) && (
                    <Button
                      aria-label="Separar pistas"
                      title="Separar pistas"
                      size="sm"
                      variant="primary"
                      disabled={sepInProgress}
                      onClick={() => handleSeparate(job.id)}
                    >{sepInProgress ? 'Separando…' : 'Separar'}</Button>
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
                {stems && (
                  <>
                    <div style={styles.labelRow}><span style={styles.barLabel}>Separación</span><span style={styles.barValue}>{Math.round(stems.sepPercent ?? 0)}% {stems.sepMessage || ''}</span></div>
                    <div style={styles.progressBarOuter} title="Progreso de separación">
                      <div style={{ ...styles.progressBarInner, width: `${Math.min(100, stems.sepPercent ?? 0).toFixed(2)}%`, background: '#22c55e' }} />
                    </div>
                  </>
                )}
              </div>
              {stems?.stems?.length ? (
                <div style={styles.stemsWrapper}>
                  <div style={styles.stemsHeader}>Pistas separadas</div>
                  <ul style={styles.stemsList}>
                    {stems.stems.map(s => (
                      <li key={s.file} style={styles.stemItem}>
                        <span>{s.name}</span>
                        <Button size="sm" variant="secondary" onClick={() => window.open(`${getApiBase()}${s.downloadUrl}`, '_blank')}>⬇</Button>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
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
  globalLabel: { fontSize: 10, opacity: 0.7 },
  stemsWrapper: { marginTop: 10, paddingTop: 10, borderTop: '1px solid #334155' },
  stemsHeader: { fontSize: 12, marginBottom: 6, opacity: 0.85 },
  stemsList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 6 },
  stemItem: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#0b1220', padding: '6px 8px', borderRadius: 6 }
};

export default JobQueue;
