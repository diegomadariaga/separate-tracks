import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export type FileStatus = 'queued' | 'processing' | 'processed' | 'failed';

export interface FileRecord {
  id: string;
  originalName: string;
  path: string;
  status: FileStatus;
  createdAt: string;
}

@Injectable()
export class DbService {
  private filePath: string;
  private cache: FileRecord[] = [];

  constructor() {
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) mkdirSync(dataDir);
    this.filePath = join(dataDir, 'files.json');
    if (existsSync(this.filePath)) {
      try { this.cache = JSON.parse(readFileSync(this.filePath, 'utf8')); } catch { this.cache = []; }
    } else {
      this.persist();
    }
  }

  private persist() {
    writeFileSync(this.filePath, JSON.stringify(this.cache, null, 2));
  }

  insertFile(partial: { originalName: string; path: string; status: FileStatus }): FileRecord {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    const record: FileRecord = { id, originalName: partial.originalName, path: partial.path, status: partial.status, createdAt };
    this.cache.unshift(record);
    this.persist();
    return record;
  }

  updateStatus(id: string, status: FileStatus) {
    const rec = this.cache.find(r => r.id === id);
    if (rec) {
      rec.status = status;
      this.persist();
    }
  }

  list(): FileRecord[] {
    return [...this.cache];
  }
}
