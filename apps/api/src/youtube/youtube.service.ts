import { Injectable, InternalServerErrorException } from '@nestjs/common';
import ytdl from 'ytdl-core';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import { randomUUID } from 'node:crypto';
import { createWriteStream, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

export interface ConversionResult {
  fileName: string;
  path: string;
  sizeBytes: number;
}

@Injectable()
export class YoutubeService {
  private mediaDir = join(process.cwd(), 'media');

  private ensureMediaDir() {
    if (!existsSync(this.mediaDir)) {
      mkdirSync(this.mediaDir, { recursive: true });
    }
  }

  async downloadAndConvertToMp3(url: string): Promise<ConversionResult> {
    this.ensureMediaDir();
    const info = await ytdl.getInfo(url);
    const titleSlug = info.videoDetails.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 60).replace(/^-|-$/g, '').toLowerCase();
    const id = randomUUID();
    const fileName = `${titleSlug || 'audio'}-${id}.mp3`;
    const outputPath = join(this.mediaDir, fileName);

    return new Promise<ConversionResult>((resolve, reject) => {
      const audioStream = ytdl(url, { quality: 'highestaudio' });
      const writeStream = createWriteStream(outputPath);
      let finished = false;

      ffmpeg(audioStream as any)
        .audioBitrate(128)
        .toFormat('mp3')
        .on('error', (err: Error) => {
          if (finished) return;
          finished = true;
          reject(new InternalServerErrorException('Error en conversión: ' + err.message));
        })
        .on('end', () => {
          if (finished) return;
          finished = true;
          try {
            const sizeBytes = writeStream.bytesWritten;
            resolve({ fileName, path: outputPath, sizeBytes });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            reject(new InternalServerErrorException('Error finalizando: ' + msg));
          }
        })
        .pipe(writeStream, { end: true });
    });
  }
}
