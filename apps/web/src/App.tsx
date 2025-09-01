import React, { useCallback, useEffect, useState } from 'react';
import { FileRecord } from './types';
import { API_URL as api, WS_STATUS_URL } from './apiConfig';
import { FileDropZone } from './components/FileDropZone';
import { UploadProgress } from './components/UploadProgress';
import { FileTable } from './components/FileTable';
import { useUploader } from './hooks/useUploader';
import { useStatusSocket } from './hooks/useStatusSocket';
import { ThemeToggle } from './components/ThemeToggle';
import { YouTubeDownloadForm } from './components/YouTubeDownloadForm';

// Central config (apiConfig) gives helper to build endpoints and final WS URL.
const API_URL = api(''); // '' => base root (may be relative "")
const WS_URL = WS_STATUS_URL;

export const App: React.FC = () => {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const { progress, uploading, upload, cancel, retry, error } = useUploader({ endpoint: API_URL + '/upload', onComplete: () => load() });

  const load = useCallback(async () => {
    try {
  const res = await fetch(API_URL + '/files');
      if (res.ok) setFiles(await res.json());
    } catch {}
  }, []);

  useEffect(() => { load(); }, [load]);
  useStatusSocket({ url: WS_URL, onStatus: (data) => setFiles(data) });

  return (
    <div className="container">
      <ThemeToggle />
  <h1>Procesamiento de Audio</h1>
  <YouTubeDownloadForm />
      <FileDropZone onFileSelected={file => upload(file)} />
      {progress !== null && (
        <UploadProgress
          value={progress}
          uploading={uploading}
          error={error}
          onCancel={cancel}
          onRetry={retry}
        />
      )}
      <h2>Archivos</h2>
      <FileTable files={files} />
    </div>
  );
};
