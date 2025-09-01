import { useCallback, useEffect, useRef } from 'react';

interface UsePollingOptions {
  interval: number; // ms
  immediate?: boolean; // run immediately on mount
  enabled?: boolean; // allow conditional activation
  stopOnError?: boolean; // stop if an error is thrown
}

interface UsePollingReturn {
  start: () => void;
  stop: () => void;
  isRunning: () => boolean;
}

/**
 * usePolling: ejecuta una función asíncrona cada X ms evitando solapamientos.
 * Si la invocación tarda más que el intervalo, espera a que termine y luego reprograma.
 */
export function usePolling(fn: () => Promise<unknown> | void, opts: UsePollingOptions): UsePollingReturn {
  const { interval, immediate = true, enabled = true, stopOnError = false } = opts;
  const timerRef = useRef<number | null>(null);
  const runningRef = useRef(false);
  const stoppedRef = useRef(false);

  const clear = () => {
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const loop = useCallback(async () => {
    if (!enabled || stoppedRef.current) return;
    if (runningRef.current) return; // evita reentradas
    runningRef.current = true;
    try {
      await fn();
    } catch (e) {
      if (stopOnError) {
        stoppedRef.current = true;
        clear();
        return;
      }
      // eslint-disable-next-line no-console
      console.error('[usePolling] error', e);
    } finally {
      runningRef.current = false;
    }
    if (!stoppedRef.current && enabled) {
      timerRef.current = window.setTimeout(loop, interval);
    }
  }, [enabled, fn, interval, stopOnError]);

  const start = useCallback(() => {
    if (stoppedRef.current) stoppedRef.current = false;
    clear();
    if (!enabled) return;
    if (immediate) {
      loop();
    } else {
      timerRef.current = window.setTimeout(loop, interval);
    }
  }, [enabled, immediate, interval, loop]);

  const stop = useCallback(() => {
    stoppedRef.current = true;
    clear();
  }, []);

  const isRunning = useCallback(() => !stoppedRef.current, []);

  useEffect(() => {
    start();
    return () => {
      stop();
    };
  }, [start, stop]);

  return { start, stop, isRunning };
}

export default usePolling;
