import { Module } from '@nestjs/common';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { YoutubeModule } from './youtube/youtube.module.js';

@Module({
  imports: [YoutubeModule],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
