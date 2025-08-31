import { Module } from '@nestjs/common';
import { UploadModule } from './upload.module';
import { QueueModule } from './queue.module';
import { StatusModule } from './status.module';

@Module({
  imports: [UploadModule, QueueModule, StatusModule]
})
export class AppModule {}
