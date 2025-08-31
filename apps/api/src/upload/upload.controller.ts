import { Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { v4 as uuid } from 'uuid';
import { QueueService } from './queue.service';
import { DbService } from './db.service';

@Controller('upload')
export class UploadController {
  constructor(private queue: QueueService, private db: DbService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: './uploads',
      filename: (_req, file, cb) => {
        const id = uuid();
        const filename = id + extname(file.originalname);
        cb(null, filename);
      }
    })
  }))
  async upload(@UploadedFile() file: any) {
    const record = this.db.insertFile({
      originalName: file.originalname,
      path: file.path,
      status: 'queued'
    });
    this.queue.enqueue(record.id);
    return { id: record.id, status: record.status };
  }
}
