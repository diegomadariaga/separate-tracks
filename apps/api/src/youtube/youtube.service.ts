import { Injectable, BadRequestException } from '@nestjs/common';
import ytdl from 'ytdl-core';
import * as path from 'path';
import { createWriteStream, existsSync, mkdirSync } from 'fs';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import { DbService } from '../upload/db.service';
import { QueueService } from '../upload/queue.service';

ffmpeg.setFfmpegPath(ffmpegStatic as string);

@Injectable()
export class YoutubeService {
    constructor(private db: DbService, private queue: QueueService) {}

    async downloadToQueue(url: string) {
        console.log('🚀 ~ YoutubeService ~ downloadToQueue ~ url:', url);
        if (!ytdl.validateURL(url)) throw new BadRequestException('URL inválida');
        const info = await ytdl.getInfo(url);
        const titleSafe = info.videoDetails.title.replace(/[^a-zA-Z0-9-_ ]/g, '_').slice(0, 60);

        const uploadsDir = path.join(process.cwd(), 'uploads');
        if (!existsSync(uploadsDir)) mkdirSync(uploadsDir);

        const tempFile = path.join(uploadsDir, `${Date.now()}_${Math.random().toString(36).slice(2)}.tmp.mp4`);
        const finalFile = path.join(uploadsDir, `${Date.now()}_${titleSafe}.mp3`);

        const record = this.db.insertFile({
            originalName: titleSafe + '.mp3',
            path: finalFile,
            status: 'downloading',
        });
        globalThis.__broadcastStatuses?.();

        await new Promise<void>((resolve, reject) => {
            const videoStream = ytdl(url, { quality: 'highestaudio' });
            const fileWrite = createWriteStream(tempFile);
            videoStream.pipe(fileWrite);
            videoStream.on('error', reject);
            fileWrite.on('error', reject);
            fileWrite.on('finish', () => resolve());
        });

        await new Promise<void>((resolve, reject) => {
            ffmpeg(tempFile)
                .audioBitrate(192)
                .toFormat('mp3')
                .on('error', (err) => reject(err))
                .on('end', (_stdout: string | null, _stderr: string | null) => resolve())
                .save(finalFile);
        });

        // Marcar listo para cola
        this.db.updateStatus(record.id, 'queued');
        globalThis.__broadcastStatuses?.();
        this.queue.enqueue(record.id);
        return { id: record.id, status: 'queued' };
    }
}
