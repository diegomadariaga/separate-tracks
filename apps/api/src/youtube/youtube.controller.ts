import { Controller, Post, Body, Get, Param, NotFoundException, Res } from '@nestjs/common';
import { YoutubeService } from './youtube.service.js';
import { DownloadYoutubeDto } from './youtube.dto.js';
import type { Response } from 'express';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

@Controller('youtube')
export class YoutubeController {
  constructor(private readonly youtube: YoutubeService) {}

  @Post('mp3')
  async convert(@Body() dto: DownloadYoutubeDto) {
    const result = await this.youtube.downloadAndConvertToMp3(dto.url);
    return {
      file: result.fileName,
      sizeBytes: result.sizeBytes,
      downloadUrl: `/youtube/download/${encodeURIComponent(result.fileName)}`
    };
  }

  @Get('download/:file')
  async download(@Param('file') file: string, @Res() res: Response) {
    const mediaDir = join(process.cwd(), 'media');
    const filePath = join(mediaDir, file);
    if (!existsSync(filePath)) throw new NotFoundException('Archivo no encontrado');
    const stat = statSync(filePath);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', stat.size.toString());
    res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
    const stream = createReadStream(filePath);
    stream.pipe(res);
  }
}
