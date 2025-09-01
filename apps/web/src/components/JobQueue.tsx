import * as React from 'react';
import { listJobs, startJob, cancelJob, deleteJob, deleteJobFile, getApiBase, QueueJobSummary } from '../lib/api.js';

interface JobQueueProps {
  refreshMs?: number;
}

export const JobQueue: React.FC<JobQueueProps> = ({ refreshMs = 1200 }) => {
  const [jobs, setJobs] = React.useState<QueueJobSummary[]>([]);
  const [loading, setLoading] = React.useState(false);
  const timerRef = React.useRef<number | null>(null);

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
    <div style={styles.wrapper}>
      <h3 style={styles.heading}>Cola de trabajos</h3>
      {loading && jobs.length === 0 && <div style={styles.info}>Cargando jobs...</div>}
      {jobs.length === 0 && !loading && <div style={styles.info}>Sin trabajos en cola.</div>}
      <ul style={styles.list}>
        {jobs.map(job => {
          const percent = job.percent.toFixed(2);
          const isTerminal = ['done','error','canceled'].includes(job.state);
          return (
            <li key={job.id} style={styles.item}>
              <div style={styles.topRow}>
                <div style={styles.titleBlock}>
                  <strong>{job.title || job.file || job.id}</strong>
                  <div style={styles.meta}>{job.state} · {percent}% {job.message ? `· ${job.message}` : ''}</div>
                </div>
                <div style={styles.actions}>
                  {job.state === 'queued' && <button onClick={() => action(job.id, startJob)} style={styles.btn}>▶</button>}
                  {['downloading','converting','pending','queued'].includes(job.state) && (
                    <button onClick={() => action(job.id, cancelJob)} style={styles.btn}>✕</button>
                  )}
                  {job.hasFile && job.file && <button onClick={() => openDownload(job.file!)} style={styles.btn}>⬇</button>}
                  {job.hasFile && <button onClick={() => action(job.id, deleteJobFile)} style={styles.btn}>🗑️F</button>}
                  {isTerminal && <button onClick={() => action(job.id, deleteJob)} style={styles.btn}>🗑️</button>}
                </div>
              </div>
              <div style={styles.dualBarsWrapper}>
                <div style={styles.labelRow}>
                  <span style={styles.barLabel}>Descarga</span>
                  <span style={styles.barValue}>{(job.downloadPercent ?? (job.state === 'done' ? 100 : job.state === 'downloading' ? (job.percent <= 50 ? (job.percent/50)*100 : 100) : (job.percent <= 50 ? (job.percent/50)*100 : 100))).toFixed(0)}%</span>
                </div>
                <div style={styles.progressBarOuter}>
                  <div style={{ ...styles.progressBarInner, width: `${Math.min(100, job.downloadPercent ?? (job.percent <= 50 ? job.percent * 2 : 100)).toFixed(2)}%`, background: '#0ea5e9' }} />
                </div>
                <div style={styles.labelRow}>
                  <span style={styles.barLabel}>Conversión</span>
                  <span style={styles.barValue}>{(job.convertPercent ?? (job.state === 'converting' ? Math.max(0, Math.min(100, ((job.percent - 50) / 49) * 100)) : job.state === 'done' ? 100 : 0)).toFixed(0)}%</span>
                </div>
                <div style={styles.progressBarOuter}>
                  <div style={{ ...styles.progressBarInner, width: `${Math.min(100, job.convertPercent ?? (job.state === 'converting' ? Math.max(0, Math.min(100, ((job.percent - 50) / 49) * 100)) : job.state === 'done' ? 100 : 0)).toFixed(2)}%`, background: '#f59e0b' }} />
                </div>
                <div style={styles.globalWrapper}>
                  <div style={styles.globalLabel}>Total</div>
                  <div style={styles.progressBarOuter}>
                    <div style={{ ...styles.progressBarInner, width: `${Math.min(100, job.percent).toFixed(2)}%`, background: colorForState(job.state) }} />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

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
  titleBlock: { display: 'flex', flexDirection: 'column', gap: 4, minWidth: 0 },
  meta: { fontSize: 12, opacity: 0.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 260 },
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
