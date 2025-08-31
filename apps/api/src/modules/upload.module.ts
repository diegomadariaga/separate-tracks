import { Module } from '@nestjs/common';
import { UploadController } from '../upload/upload.controller';
import { QueueService } from '../upload/queue.service';
import { DbService } from '../upload/db.service';
import { StatusGateway } from '../ws/status.gateway';

@Module({
  controllers: [UploadController],
  providers: [QueueService, DbService, StatusGateway],
  exports: [QueueService, DbService]
})
export class UploadModule {}
