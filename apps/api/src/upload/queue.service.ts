import { Injectable } from '@nestjs/common';

declare global {
  // Declaración para función global de broadcasting establecida en main.ts
  // eslint-disable-next-line no-var
  var __broadcastStatuses: (() => void) | undefined;
}
import { DbService } from './db.service';

@Injectable()
export class QueueService {
  private processing = false;
  private queue: string[] = [];
  private currentId: string | null = null;
  private abortController: AbortController | null = null;

  constructor(private db: DbService) {}

  enqueue(id: string) {
    this.queue.push(id);
    this.processNext();
  }

  private async processNext() {
    if (this.processing) return;
    const next = this.queue.shift();
    if (!next) return;
    this.processing = true;
    this.currentId = next;
    this.abortController = new AbortController();
    this.db.updateStatus(next, 'processing');
  globalThis.__broadcastStatuses?.();
    try {
      // Simular procesamiento en pasos pequeños, chequeando abort
      const steps = 8;
      for (let i = 0; i < steps; i++) {
        if (this.abortController.signal.aborted) throw new Error('aborted');
        await new Promise(r => setTimeout(r, 250));
      }
      this.db.updateStatus(next, 'processed');
    } catch (e: any) {
      this.db.updateStatus(next, 'failed');
    } finally {
  globalThis.__broadcastStatuses?.();
      this.processing = false;
      this.currentId = null;
      this.abortController = null;
      if (this.queue.length) this.processNext();
    }
  }

  cancel(id: string): boolean {
    // Si está en la cola, eliminar
    const idx = this.queue.indexOf(id);
    if (idx !== -1) {
      this.queue.splice(idx, 1);
      this.db.updateStatus(id, 'failed');
  globalThis.__broadcastStatuses?.();
      return true;
    }
    // Si es el que se procesa actualmente
    if (this.currentId === id && this.abortController) {
      this.abortController.abort();
      return true;
    }
    return false;
  }

  retry(id: string): boolean {
    const rec = this.db.list().find(r => r.id === id);
    if (!rec || rec.status !== 'failed') return false;
    this.db.updateStatus(id, 'queued');
    this.enqueue(id);
  globalThis.__broadcastStatuses?.();
    return true;
  }
}
