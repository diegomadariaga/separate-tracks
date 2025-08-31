import React, { useCallback, useEffect, useState } from 'react';
import { FileRecord } from './types';
import { FileDropZone } from './components/FileDropZone';
import { UploadProgress } from './components/UploadProgress';
import { FileTable } from './components/FileTable';

const WS_URL = 'ws://localhost:3000/ws/status';
const API_URL = 'http://localhost:3000';

interface UploadState { progress: number | null; uploading: boolean; }

const useUploader = (onDone: () => void) => {
  const [state, setState] = useState<UploadState>({ progress: null, uploading: false });
  const upload = useCallback((file: File) => {
    const form = new FormData();
    form.append('file', file);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', API_URL + '/upload');
    setState({ progress: 0, uploading: true });
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setState(s => ({ ...s, progress: Math.round((e.loaded / e.total) * 100) }));
      }
    };
    const finalize = () => { setState({ progress: null, uploading: false }); onDone(); };
    xhr.onload = finalize;
    xhr.onerror = () => { alert('Fallo la subida'); finalize(); };
    xhr.send(form);
  }, [onDone]);
  return { ...state, upload };
};

export const App: React.FC = () => {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const { progress, uploading, upload } = useUploader(() => load());

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
      <FileDropZone onFileSelected={file => upload(file)} />
      {progress !== null && <UploadProgress value={progress} />}
      <h2>Archivos</h2>
      <FileTable files={files} />
    </div>
  );
};
