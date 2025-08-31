import { Module } from '@nestjs/common';
import { YoutubeService } from './youtube.service';
import { YoutubeController } from './youtube.controller';
import { UploadModule } from '../modules/upload.module';
import { QueueModule } from '../modules/queue.module';
import { StatusModule } from '../modules/status.module';

@Module({
  imports: [UploadModule, QueueModule, StatusModule],
  providers: [YoutubeService],
  controllers: [YoutubeController]
})
export class YoutubeModule {}
