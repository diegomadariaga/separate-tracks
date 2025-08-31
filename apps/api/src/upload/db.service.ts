import { Injectable } from '@nestjs/common';
import Database from 'better-sqlite3';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';

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
  private db: Database.Database;

  constructor() {
    const dataDir = join(process.cwd(), 'data');
    if (!existsSync(dataDir)) mkdirSync(dataDir);
    this.db = new Database(join(dataDir, 'files.db'));
    this.db.prepare(`CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      originalName TEXT,
      path TEXT,
      status TEXT,
      createdAt TEXT
    )`).run();
  }

  insertFile(partial: { originalName: string; path: string; status: FileStatus }): FileRecord {
    const id = crypto.randomUUID();
    const createdAt = new Date().toISOString();
    this.db.prepare('INSERT INTO files (id, originalName, path, status, createdAt) VALUES (?, ?, ?, ?, ?)')
      .run(id, partial.originalName, partial.path, partial.status, createdAt);
    return { id, originalName: partial.originalName, path: partial.path, status: partial.status, createdAt };
  }

  updateStatus(id: string, status: FileStatus) {
    this.db.prepare('UPDATE files SET status=? WHERE id=?').run(status, id);
  }

  list(): FileRecord[] {
    return this.db.prepare('SELECT * FROM files ORDER BY createdAt DESC').all();
  }
}
