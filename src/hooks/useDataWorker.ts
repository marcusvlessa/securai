// Hook personalizado para usar Web Workers de forma eficiente
import { useRef, useCallback } from 'react';

export type WorkerTask = 'parse-csv' | 'parse-excel' | 'parse-json';

interface UseDataWorkerResult {
  process: <T>(task: WorkerTask, payload: unknown) => Promise<T>;
  terminate: () => void;
}

export function useDataWorker(): UseDataWorkerResult {
  const workerRef = useRef<Worker | null>(null);

  const process = useCallback(<T,>(task: WorkerTask, payload: unknown): Promise<T> => {
    return new Promise((resolve, reject) => {
      // Criar worker se não existir
      if (!workerRef.current) {
        workerRef.current = new Worker(
          new URL('../workers/dataParser.worker.ts', import.meta.url),
          { type: 'module' }
        );
      }

      const id = Math.random().toString(36).substring(7);
      
      const handleMessage = (e: MessageEvent) => {
        if (e.data.id !== id) return;

        if (e.data.type === 'success') {
          resolve(e.data.data as T);
          workerRef.current?.removeEventListener('message', handleMessage);
        } else if (e.data.type === 'error') {
          reject(new Error(e.data.error));
          workerRef.current?.removeEventListener('message', handleMessage);
        }
      };

      workerRef.current.addEventListener('message', handleMessage);
      workerRef.current.postMessage({ type: task, payload, id });
    });
  }, []);

  const terminate = useCallback(() => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  return { process, terminate };
}
