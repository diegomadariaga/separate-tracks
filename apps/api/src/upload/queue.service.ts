import { Injectable } from '@nestjs/common';
import { DbService } from './db.service';
import { StatusGateway } from '../ws/status.gateway';

@Injectable()
export class QueueService {
  private processing = false;
  private queue: string[] = [];

  constructor(private db: DbService, private gateway: StatusGateway) {}

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
    this.gateway.broadcastStatus();
    // Simular procesamiento
    await new Promise(r => setTimeout(r, 2000));
    this.db.updateStatus(next, 'processed');
    this.gateway.broadcastStatus();
    this.processing = false;
    if (this.queue.length) this.processNext();
  }
}
