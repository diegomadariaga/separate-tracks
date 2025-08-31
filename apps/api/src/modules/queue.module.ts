import { Module } from '@nestjs/common';
import { QueueService } from '../upload/queue.service';
import { DbService } from '../upload/db.service';

@Module({
  providers: [QueueService, DbService],
  exports: [QueueService, DbService]
})
export class QueueModule {}
