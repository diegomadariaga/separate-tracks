import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button } from '@repo/ui';

interface FileRecord {
  id: string;
  originalName: string;
  status: string;
  createdAt: string;
}

const WS_URL = 'ws://localhost:3000/ws/status';
const API_URL = 'http://localhost:3000';

const UploadArea: React.FC<{ onUploaded: () => void }> = ({ onUploaded }) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState<number | null>(null);

  const onFiles = useCallback((files: FileList | null) => {
    if (!files || !files.length) return;
    const file = files[0];
    const form = new FormData();
    form.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', API_URL + '/upload');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setProgress(Math.round((e.loaded / e.total) * 100));
      }
    };
    xhr.onload = () => {
      setProgress(null);
      onUploaded();
    };
    xhr.onerror = () => {
      setProgress(null);
      alert('Fallo la subida');
    };
    xhr.send(form);
  }, [onUploaded]);

  return (
    <div className="fade-in" style={{ marginBottom: 40 }}>
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        style={{ display: 'none' }}
        onChange={e => onFiles(e.target.files)}
      />
      <div
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={e => { e.preventDefault(); setDragging(false); }}
        onDrop={e => { e.preventDefault(); setDragging(false); onFiles(e.dataTransfer.files); }}
        className={dragging ? 'upload-area dragging' : 'upload-area'}
      >
        <p style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>Arrastra un archivo de audio o</p>
        <Button style={{ marginTop: 18 }} onClick={() => inputRef.current?.click()} size="lg">Selecciona</Button>
        {progress !== null && (
          <div style={{ marginTop: 18, maxWidth: 480, marginLeft: 'auto', marginRight: 'auto' }}>
            <div style={{ fontSize: 13, letterSpacing: .3 }}>Subiendo: {progress}%</div>
            <div className="progress-bar"><span style={{ width: progress + '%' }} /></div>
          </div>
        )}
      </div>
    </div>
  );
};

const FileList: React.FC<{ files: FileRecord[] }> = ({ files }) => (
  <div className="table-wrapper fade-in" style={{ marginTop: 12 }}>
    <table>
      <thead>
        <tr>
          <th>Nombre</th>
          <th>Estado</th>
          <th>Creado</th>
        </tr>
      </thead>
      <tbody>
        {files.map(f => (
          <tr key={f.id}>
            <td>{f.originalName}</td>
            <td>{f.status}</td>
            <td>{new Date(f.createdAt).toLocaleString()}</td>
          </tr>
        ))}
        {!files.length && (
          <tr><td colSpan={3} className="muted" style={{ textAlign: 'center', padding: 20, fontSize: 14 }}>Sin archivos</td></tr>
        )}
      </tbody>
    </table>
  </div>
);

export const App: React.FC = () => {
  const [files, setFiles] = useState<FileRecord[]>([]);

  const load = useCallback(async () => {
    try {
      const res = await fetch(API_URL + '/files');
      if (res.ok) setFiles(await res.json());
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    let ws: WebSocket | null = null;
    const connect = () => {
      ws = new WebSocket(WS_URL);
      ws.onmessage = ev => {
        try {
          const msg = JSON.parse(ev.data);
          if (msg.type === 'status') setFiles(msg.data);
        } catch {}
      };
      ws.onclose = () => setTimeout(connect, 2000);
    };
    connect();
    return () => { ws?.close(); };
  }, []);

  return (
    <div className="container">
      <h1>Procesamiento de Audio</h1>
      <UploadArea onUploaded={load} />
      <h2>Archivos</h2>
      <FileList files={files} />
    </div>
  );
};
