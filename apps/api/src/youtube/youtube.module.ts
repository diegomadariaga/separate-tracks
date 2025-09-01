import { Module } from '@nestjs/common';
import { YoutubeService } from './youtube.service.js';
import { YoutubeController } from './youtube.controller.js';

@Module({
  providers: [YoutubeService],
  controllers: [YoutubeController],
  exports: [YoutubeService]
})
export class YoutubeModule {}
