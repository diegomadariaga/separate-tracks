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
    <div style={{ marginBottom: 24 }}>
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
        style={{
          padding: 32,
            border: '2px dashed ' + (dragging ? '#2563eb' : '#94a3b8'),
            borderRadius: 12,
            textAlign: 'center',
            background: dragging ? '#eff6ff' : '#f8fafc',
            transition: 'all .15s'
        }}
      >
        <p style={{ margin: 0, fontSize: 14 }}>Arrastra un archivo de audio o</p>
        <Button style={{ marginTop: 8 }} onClick={() => inputRef.current?.click()}>Selecciona</Button>
        {progress !== null && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12 }}>Subiendo: {progress}%</div>
            <div style={{ height: 6, background: '#e2e8f0', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ height: '100%', width: progress + '%', background: '#2563eb', transition: 'width .2s' }} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FileList: React.FC<{ files: FileRecord[] }> = ({ files }) => {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
      <thead>
        <tr style={{ textAlign: 'left', background: '#f1f5f9' }}>
          <th style={{ padding: '8px 6px', fontSize: 12 }}>Nombre</th>
          <th style={{ padding: '8px 6px', fontSize: 12 }}>Estado</th>
          <th style={{ padding: '8px 6px', fontSize: 12 }}>Creado</th>
        </tr>
      </thead>
      <tbody>
        {files.map(f => (
          <tr key={f.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
            <td style={{ padding: '6px 6px', fontSize: 13 }}>{f.originalName}</td>
            <td style={{ padding: '6px 6px', fontSize: 13 }}>{f.status}</td>
            <td style={{ padding: '6px 6px', fontSize: 13 }}>{new Date(f.createdAt).toLocaleString()}</td>
          </tr>
        ))}
        {!files.length && (
          <tr><td colSpan={3} style={{ padding: 12, fontSize: 12, textAlign: 'center', color: '#64748b' }}>Sin archivos</td></tr>
        )}
      </tbody>
    </table>
  );
};

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
    <div style={{ fontFamily: 'system-ui, sans-serif', padding: 32, maxWidth: 800, margin: '0 auto' }}>
      <h1 style={{ marginTop: 0 }}>Procesamiento de Audio</h1>
      <UploadArea onUploaded={load} />
      <h2 style={{ fontSize: 16, marginTop: 0 }}>Archivos</h2>
      <FileList files={files} />
    </div>
  );
};
