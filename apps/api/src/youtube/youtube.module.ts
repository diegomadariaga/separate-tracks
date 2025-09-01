import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { YoutubeService } from './youtube.service.js';
import { YoutubeController } from './youtube.controller.js';
import { YoutubeJobEntity } from './job.entity.js';

@Module({
  imports: [TypeOrmModule.forFeature([YoutubeJobEntity])],
  providers: [YoutubeService],
  controllers: [YoutubeController],
  exports: [YoutubeService]
})
export class YoutubeModule {}
