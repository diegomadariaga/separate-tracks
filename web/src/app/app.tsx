// Uncomment this line to use CSS modules
// import styles from './app.module.css';
import NxWelcome from './nx-welcome';
import { AudioUploader } from './AudioUploader';

export function App() {
  return (
    <div>
      <NxWelcome title="web" />
      <div style={{maxWidth:'640px', margin:'2rem auto'}}>
        <h2>Sube tu archivo de audio</h2>
        <AudioUploader />
      </div>
    </div>
  );
}

export default App;
