import { Body, Controller, Post } from '@nestjs/common';
import { YoutubeService } from './youtube.service';

class YoutubeDto { url!: string }

@Controller('youtube')
export class YoutubeController {
  constructor(private yt: YoutubeService) {}

  @Post()
  async create(@Body() body: YoutubeDto) {
    return this.yt.downloadToQueue(body.url);
  }
}
