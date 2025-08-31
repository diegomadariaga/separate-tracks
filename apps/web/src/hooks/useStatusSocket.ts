import { useEffect, useRef } from 'react';
import { FileRecord } from '../types';

export interface UseStatusSocketOptions {
  url: string;
  onStatus: (files: FileRecord[]) => void;
  retryDelayMs?: number;
}

export const useStatusSocket = ({ url, onStatus, retryDelayMs = 2000 }: UseStatusSocketOptions) => {
  const wsRef = useRef<WebSocket | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    let active = true;
    function connect() {
      if (!active) return;
      try {
        wsRef.current = new WebSocket(url);
        wsRef.current.onmessage = ev => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.type === 'status') onStatus(msg.data as FileRecord[]);
          } catch {}
        };
        wsRef.current.onclose = () => {
          if (!active) return;
          timerRef.current = window.setTimeout(connect, retryDelayMs);
        };
        wsRef.current.onerror = () => {
          wsRef.current?.close();
        };
      } catch {
        timerRef.current = window.setTimeout(connect, retryDelayMs);
      }
    }
    connect();
    return () => {
      active = false;
      if (timerRef.current) window.clearTimeout(timerRef.current);
      wsRef.current?.close();
    };
  }, [url, onStatus, retryDelayMs]);
};
