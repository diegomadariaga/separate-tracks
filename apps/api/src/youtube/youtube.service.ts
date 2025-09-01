import { Injectable, InternalServerErrorException, Logger, BadRequestException } from '@nestjs/common';
import ytdl from '@distube/ytdl-core';
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

export interface RawDownloadResult {
  fileName: string;
  path: string;
  sizeBytes: number;
  format: string;
}

export type JobState = 'pending' | 'downloading' | 'converting' | 'done' | 'error';
export interface JobProgress {
  id: string;
  state: JobState;
  percent: number; // 0-100
  stagePercent?: number; // porcentaje de la etapa actual
  message?: string;
  result?: ConversionResult;
  error?: string;
  createdAt: number;
  updatedAt: number;
}

@Injectable()
export class YoutubeService {
  private mediaDir = join(process.cwd(), 'media');
  private readonly logger = new Logger(YoutubeService.name);
  private jobs = new Map<string, JobProgress>();

  getJob(id: string): JobProgress | undefined {
    return this.jobs.get(id);
  }

  private updateJob(id: string, patch: Partial<JobProgress>) {
    const current = this.jobs.get(id);
    if (!current) return;
    const updated: JobProgress = { ...current, ...patch, updatedAt: Date.now() };
    // Derivar percent principal en base a state/stagePercent si no se setea explícito
    this.jobs.set(id, updated);
  }

  startMp3Job(url: string): string {
    const id = randomUUID();
    const now = Date.now();
    this.jobs.set(id, { id, state: 'pending', percent: 0, createdAt: now, updatedAt: now });
    this.processMp3Job(id, url).catch(err => {
      this.updateJob(id, { state: 'error', error: err instanceof Error ? err.message : String(err), percent: 100 });
    });
    return id;
  }

  private async processMp3Job(id: string, url: string) {
    this.updateJob(id, { state: 'downloading', message: 'Obteniendo info...' });
    let info;
    try {
      info = await ytdl.getInfo(url);
    } catch (e: any) {
      if (e && /extract functions/i.test(e.message)) {
        throw new BadRequestException('YouTube cambió su página, intenta más tarde (firma no extraída)');
      }
      throw e;
    }
    const titleSlug = info.videoDetails.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 60).replace(/^-|-$/g, '').toLowerCase();
    const fileName = `${titleSlug || 'audio'}-${id}.mp3`;
    const outputPath = join(this.mediaDir, fileName);

    const audioStream = ytdl(url, { quality: 'highestaudio', filter: 'audioonly' });
    let finished = false;
    const writeStream = createWriteStream(outputPath);

    const totalUnknownFallbackStart = Date.now();

    audioStream.on('progress', (_chunk: number, downloaded: number, total: number) => {
      let percent = total ? (downloaded / total) * 50 : Math.min(50, ((Date.now() - totalUnknownFallbackStart) / 30000) * 50);
      if (percent > 50) percent = 50; // primera mitad
      this.updateJob(id, { state: 'downloading', percent, stagePercent: percent, message: 'Descargando audio...' });
    });

    const bail = (err: Error, context: string) => {
      if (finished) return;
      finished = true;
      this.updateJob(id, { state: 'error', error: `${context}: ${err.message}`, message: 'Error', percent: 100 });
    };
    audioStream.on('error', e => bail(e, 'Error stream YouTube'));
    writeStream.on('error', e => bail(e, 'Error escritura archivo'));

    ffmpeg(audioStream as any)
      .audioBitrate(128)
      .toFormat('mp3')
      .on('start', () => this.updateJob(id, { state: 'converting', message: 'Convirtiendo...', percent: 55 }))
      .on('progress', (p: any) => {
        const convPercent = p?.percent ? Math.min(100, Math.max(0, p.percent)) : 0;
        // Mapear progreso conversión a segmento 50-99
        const global = 50 + (convPercent / 100) * 49; // deja 1% final para flush
        this.updateJob(id, { state: 'converting', percent: global, stagePercent: convPercent, message: 'Convirtiendo...' });
      })
      .on('error', (err: Error) => bail(err, 'Error en conversión'))
      .on('end', () => {
        if (finished) return;
        finished = true;
        try {
          const sizeBytes = writeStream.bytesWritten;
          const result: ConversionResult = { fileName, path: outputPath, sizeBytes };
            this.updateJob(id, { state: 'done', percent: 100, result, message: 'Completado' });
        } catch (e: any) {
          bail(e, 'Error finalizando');
        }
      })
      .save(outputPath);
  }

  private ensureMediaDir() {
    if (!existsSync(this.mediaDir)) {
      mkdirSync(this.mediaDir, { recursive: true });
    }
  }

  async downloadAndConvertToMp3(url: string): Promise<ConversionResult> {
    this.ensureMediaDir();
    this.logger.log(`Iniciando descarga/conversión URL=${url}`);
    let info;
    try {
      info = await ytdl.getInfo(url);
    } catch (e: any) {
      if (e && /extract functions/i.test(e.message)) {
        throw new BadRequestException('YouTube cambió su página, intenta más tarde (firma no extraída)');
      }
      throw e;
    }
    const titleSlug = info.videoDetails.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 60).replace(/^-|-$/g, '').toLowerCase();
    const id = randomUUID();
    const fileName = `${titleSlug || 'audio'}-${id}.mp3`;
    const outputPath = join(this.mediaDir, fileName);
    this.logger.debug(`Archivo de salida: ${outputPath}`);

    return new Promise<ConversionResult>((resolve, reject) => {
      const audioStream = ytdl(url, { quality: 'highestaudio', filter: 'audioonly' });
      const writeStream = createWriteStream(outputPath);
      let finished = false;

      const bail = (err: Error, context: string) => {
        if (finished) return;
        finished = true;
        this.logger.error(`${context}: ${err.message}`);
        reject(new InternalServerErrorException(`${context}: ${err.message}`));
      };

      audioStream.on('progress', (_chunkLength: number, downloaded: number, total: number) => {
        const percent = (downloaded / total * 100).toFixed(2);
        if (Number.isFinite(Number(percent))) {
          this.logger.verbose(`Progreso descarga: ${percent}%`);
        }
      });

      audioStream.on('error', (err: Error) => bail(err, 'Error stream YouTube'));

      writeStream.on('error', (err: Error) => bail(err, 'Error escritura archivo'));

      ffmpeg(audioStream as any)
        .audioBitrate(128)
        .toFormat('mp3')
        .on('start', (cmdLine: string) => this.logger.debug('FFmpeg start: ' + cmdLine))
        .on('progress', (p: any) => {
          if (p?.percent) this.logger.verbose(`FFmpeg progreso: ${p.percent.toFixed ? p.percent.toFixed(2) : p.percent}%`);
        })
        .on('error', (err: Error) => bail(err, 'Error en conversión'))
        .on('end', () => {
          if (finished) return;
          finished = true;
          try {
            const sizeBytes = writeStream.bytesWritten;
            this.logger.log(`Conversión completada archivo=${fileName} size=${sizeBytes}`);
            resolve({ fileName, path: outputPath, sizeBytes });
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : String(e);
            bail(new Error(msg), 'Error finalizando');
          }
        })
        .save(outputPath);
    });
  }

  async downloadAudioRaw(url: string): Promise<RawDownloadResult> {
    this.ensureMediaDir();
    this.logger.log(`Iniciando descarga RAW URL=${url}`);
    let info;
    try {
      info = await ytdl.getInfo(url);
    } catch (e: any) {
      if (e && /extract functions/i.test(e.message)) {
        throw new BadRequestException('YouTube cambió su página, intenta más tarde (firma no extraída)');
      }
      throw e;
    }
    const titleSlug = info.videoDetails.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 60).replace(/^-|-$/g, '').toLowerCase();
    // Buscar formato de sólo audio preferentemente opus/webm o m4a
    const audioFormat = ytdl.chooseFormat(info.formats, { quality: 'highestaudio' });
    const ext = (audioFormat.container || 'audio').toLowerCase();
    const id = randomUUID();
    const fileName = `${titleSlug || 'audio'}-${id}.${ext}`;
    const outputPath = join(this.mediaDir, fileName);
    this.logger.debug(`Archivo RAW salida: ${outputPath}`);

    return new Promise<RawDownloadResult>((resolve, reject) => {
      const audioStream = ytdl.downloadFromInfo(info, { quality: 'highestaudio', filter: 'audioonly' });
      const writeStream = createWriteStream(outputPath);
      let finished = false;

      const bail = (err: Error, context: string) => {
        if (finished) return;
        finished = true;
        this.logger.error(`${context}: ${err.message}`);
        reject(new InternalServerErrorException(`${context}: ${err.message}`));
      };

      audioStream.on('progress', (_chunk: number, downloaded: number, total: number) => {
        const percent = (downloaded / total * 100).toFixed(2);
        this.logger.verbose(`RAW progreso descarga: ${percent}%`);
      });
      audioStream.on('error', (e: Error) => bail(e, 'Error stream RAW'));
      writeStream.on('error', (e: Error) => bail(e, 'Error escritura RAW'));
      writeStream.on('finish', () => {
        if (finished) return;
        finished = true;
        const sizeBytes = writeStream.bytesWritten;
        this.logger.log(`Descarga RAW completada archivo=${fileName} size=${sizeBytes}`);
        resolve({ fileName, path: outputPath, sizeBytes, format: ext });
      });
      audioStream.pipe(writeStream);
    });
  }
}
