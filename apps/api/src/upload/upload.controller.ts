import { Controller, Post, UploadedFile, UseInterceptors, Delete, Param, BadRequestException, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import type { Request } from 'express';
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
      filename: (_req: Request, file: Express.Multer.File, cb: (error: Error | null, filename: string) => void) => {
        const id = uuid();
        const filename = id + extname(file.originalname);
        cb(null, filename);
      }
    })
  }))
  async upload(@UploadedFile() file: Express.Multer.File) {
    const record = this.db.insertFile({
      originalName: file.originalname,
      path: file.path,
      status: 'queued'
    });
    this.queue.enqueue(record.id);
    return { id: record.id, status: record.status };
  }

  @Delete(':id')
  cancel(@Param('id') id: string) {
    const exists = this.db.list().some(r => r.id === id);
    if (!exists) throw new NotFoundException('Archivo no encontrado');
    const ok = this.queue.cancel(id);
    if (!ok) throw new BadRequestException('No se pudo cancelar');
    return { id, status: 'failed', cancelled: true };
  }

  @Post(':id/retry')
  retry(@Param('id') id: string) {
    const ok = this.queue.retry(id);
    if (!ok) throw new BadRequestException('No se puede reintentar');
    return { id, status: 'queued', retried: true };
  }
}
