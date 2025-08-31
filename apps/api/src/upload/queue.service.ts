import { Injectable } from '@nestjs/common';
import { DbService } from './db.service';

@Injectable()
export class QueueService {
  private processing = false;
  private queue: string[] = [];

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
    this.db.updateStatus(next, 'processing');
  globalThis.__broadcastStatuses?.();
    // Simular procesamiento
    await new Promise(r => setTimeout(r, 2000));
    this.db.updateStatus(next, 'processed');
  globalThis.__broadcastStatuses?.();
    this.processing = false;
    if (this.queue.length) this.processNext();
  }
}
