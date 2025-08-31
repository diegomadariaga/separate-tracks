import { Module } from '@nestjs/common';
import { UploadController } from '../upload/upload.controller';
import { QueueService } from '../upload/queue.service';
import { DbService } from '../upload/db.service';

@Module({
  controllers: [UploadController],
  providers: [QueueService, DbService],
  exports: [QueueService, DbService]
})
export class UploadModule {}
