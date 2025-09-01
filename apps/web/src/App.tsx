import { YouTubeToMp3 } from './components/YouTubeToMp3.js';

export function App() {
  return (
    <main style={{ fontFamily: 'system-ui', padding: 32, maxWidth: 960, margin: '0 auto' }}>
      <header style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 36, margin: '0 0 8px' }}>Separate Tracks</h1>
        <p style={{ margin: 0, opacity: 0.8 }}>Vite + React + TypeScript + Turborepo</p>
      </header>
      <YouTubeToMp3 />
    </main>
  );
}

export default App;
