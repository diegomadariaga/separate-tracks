import React, { useCallback, useRef, useState } from 'react';

interface UploadState {
  status: 'idle' | 'uploading' | 'success' | 'error';
  message?: string;
}

const PLACEHOLDER_UPLOAD_URL = 'https://api.example.com/upload-audio'; // TODO: reemplazar con endpoint real

const acceptedMimePrefixes = ['audio/'];

function isAudioFile(file: File) {
  return acceptedMimePrefixes.some((p) => file.type.startsWith(p));
}

export const AudioUploader: React.FC = () => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [uploadState, setUploadState] = useState<UploadState>({ status: 'idle' });
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFiles = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!isAudioFile(file)) {
      setUploadState({ status: 'error', message: 'El archivo debe ser de audio.' });
      return;
    }
    setSelectedFile(file);
    setUploadState({ status: 'uploading', message: 'Subiendo...' });
    try {
      const formData = new FormData();
      formData.append('file', file, file.name);
      const res = await fetch(PLACEHOLDER_UPLOAD_URL, {
        method: 'POST',
        body: formData,
      });
      if (!res.ok) {
        throw new Error(`Status ${res.status}`);
      }
      setUploadState({ status: 'success', message: 'Archivo subido correctamente (placeholder).' });
    } catch {
      setUploadState({ status: 'error', message: 'Error al subir archivo (placeholder).' });
    }
  }, []);

  const onButtonClick = () => {
    inputRef.current?.click();
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    void handleFiles(e.target.files);
  };

  const preventDefaults = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const onDragEnter = (e: React.DragEvent) => {
    preventDefaults(e);
    setDragActive(true);
  };
  const onDragLeave = (e: React.DragEvent) => {
    preventDefaults(e);
    setDragActive(false);
  };
  const onDragOver = (e: React.DragEvent) => {
    preventDefaults(e);
  };
  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    preventDefaults(e);
    setDragActive(false);
    void handleFiles(e.dataTransfer.files);
  };

  return (
    <div>
      <div style={{ marginBottom: '1rem' }}>
        <button type="button" onClick={onButtonClick} data-testid="select-audio-btn">
          Seleccionar archivo de audio
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="audio/*"
          style={{ display: 'none' }}
          onChange={onInputChange}
          data-testid="file-input"
        />
      </div>
      <div
        onDragEnter={onDragEnter}
        onDragLeave={onDragLeave}
        onDragOver={onDragOver}
        onDrop={onDrop}
        data-testid="drop-zone"
        style={{
          border: '2px dashed #888',
          padding: '2rem',
          textAlign: 'center',
          borderColor: dragActive ? '#1976d2' : '#888',
          background: dragActive ? '#e3f2fd' : 'transparent',
          transition: 'all 0.2s ease-in-out',
        }}
      >
        {dragActive ? 'Suelta el archivo aquí' : 'Arrastra tu archivo de audio aquí o usa el botón'}
      </div>
      <div style={{ marginTop: '1rem', minHeight: '1.5rem' }} data-testid="status-area">
        {selectedFile && <div data-testid="selected-file">Archivo: {selectedFile.name}</div>}
        {uploadState.status !== 'idle' && (
          <div data-testid={`upload-${uploadState.status}`}>{uploadState.message}</div>
        )}
      </div>
    </div>
  );
};

export default AudioUploader;
