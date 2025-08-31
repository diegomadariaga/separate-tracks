import { Module } from '@nestjs/common';
import { UploadModule } from './upload.module';
import { QueueModule } from './queue.module';
import { StatusModule } from './status.module';
import { YoutubeModule } from '../youtube/youtube.module';

@Module({
  imports: [UploadModule, QueueModule, StatusModule, YoutubeModule]
})
export class AppModule {}
