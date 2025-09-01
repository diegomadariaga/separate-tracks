import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { YoutubeModule } from './youtube/youtube.module.js';
import { YoutubeJobEntity } from './youtube/job.entity.js';

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'sqlite',
      database: 'data.sqlite',
      entities: [YoutubeJobEntity],
      synchronize: true,
    }),
    YoutubeModule
  ],
  controllers: [AppController],
  providers: [AppService]
})
export class AppModule {}
