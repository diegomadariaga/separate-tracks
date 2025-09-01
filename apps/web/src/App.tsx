import { YouTubeToMp3 } from './components/YouTubeToMp3.js';
import JobQueue from './components/JobQueue.js';

export function App() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: '32px 24px', maxWidth: 1180, margin: '0 auto', color: '#f1f5f9', background: '#0b1220', minHeight: '100vh' }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 36, margin: '0 0 8px' }}>Separate Tracks</h1>
        <p style={{ margin: 0, opacity: 0.8 }}>Vite + React + TypeScript + Turborepo</p>
      </header>
      <YouTubeToMp3 />
      <section style={{ marginTop: 48 }}>
        <div style={{ width: '100%', maxWidth: 1180, margin: '0 auto' }}>
          <JobQueue />
        </div>
      </section>
    </main>
  );
}

export default App;
