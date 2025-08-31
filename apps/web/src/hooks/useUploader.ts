import { useCallback, useRef, useState } from 'react';

export interface UploadState {
  progress: number | null;
  uploading: boolean;
  error: string | null;
  fileName: string | null;
}

export interface UseUploaderOptions {
  endpoint: string;
  onComplete?: () => void;
}

export const useUploader = ({ endpoint, onComplete }: UseUploaderOptions) => {
  const [state, setState] = useState<UploadState>({ progress: null, uploading: false, error: null, fileName: null });
  const xhrRef = useRef<XMLHttpRequest | null>(null);
  const lastFileRef = useRef<File | null>(null);

  const reset = useCallback(() => setState({ progress: null, uploading: false, error: null, fileName: null }), []);

  const upload = useCallback((file: File) => {
    if (state.uploading) return;
    lastFileRef.current = file;
    const xhr = new XMLHttpRequest();
    xhrRef.current = xhr;
    const form = new FormData();
    form.append('file', file);
    setState({ progress: 0, uploading: true, error: null, fileName: file.name });
    xhr.open('POST', endpoint);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) {
        setState(s => ({ ...s, progress: Math.round((e.loaded / e.total) * 100) }));
      }
    };
    const finalize = () => {
      setState(s => ({ ...s, uploading: false, progress: null }));
      onComplete?.();
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) finalize();
      else setState(s => ({ ...s, uploading: false, error: `Error ${xhr.status}` }));
    };
    xhr.onerror = () => setState(s => ({ ...s, uploading: false, error: 'Error de red' }));
    xhr.onabort = () => setState(s => ({ ...s, uploading: false, error: 'Cancelado' }));
    xhr.send(form);
  }, [endpoint, onComplete, state.uploading]);

  const cancel = useCallback(() => {
    if (xhrRef.current && state.uploading) xhrRef.current.abort();
  }, [state.uploading]);

  const retry = useCallback(() => {
    if (lastFileRef.current && !state.uploading) {
      setState(s => ({ ...s, error: null }));
      upload(lastFileRef.current);
    }
  }, [state.uploading, upload]);

  return { ...state, upload, cancel, retry, reset };
};
