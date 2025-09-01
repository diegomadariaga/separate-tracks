import { Injectable, InternalServerErrorException, Logger, BadRequestException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { YoutubeJobEntity } from './job.entity.js';
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
  title?: string;
  durationSeconds?: number;
}

export interface RawDownloadResult {
  fileName: string;
  path: string;
  sizeBytes: number;
  format: string;
}

export type JobState = 'queued' | 'pending' | 'downloading' | 'converting' | 'done' | 'error' | 'canceled';
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
  url?: string;
  downloadPercent?: number; // 0-100 real descarga
  convertPercent?: number; // 0-100 real conversión
  title?: string;
  durationSeconds?: number;
  thumbnailUrl?: string;
  author?: string;
  downloadEtaSeconds?: number;
  convertEtaSeconds?: number;
}

@Injectable()
export class YoutubeService implements OnModuleInit {
  private mediaDir = join(process.cwd(), 'media');
  private readonly logger = new Logger(YoutubeService.name);
  private jobs = new Map<string, JobProgress>();
  private readonly jobTtlMs = 60 * 60 * 1000; // 1h
  private readonly fileTtlMs = 24 * 60 * 60 * 1000; // 24h
  private cleanupTimer: NodeJS.Timeout | null = null;
  private readonly maxConcurrent = 3;
  private currentRunning = 0;
  private controllers = new Map<string, { audioStream?: any; ffmpeg?: any; writeStream?: any }>();
  private sseClients = new Set<import('http').ServerResponse>();
  private lastBroadcast: Record<string, number> = {};

  registerSseClient(res: import('http').ServerResponse) {
    this.sseClients.add(res);
    res.on('close', () => this.sseClients.delete(res));
    const snapshot = this.listJobs();
    res.write('event: init\n');
    res.write(`data: ${JSON.stringify(snapshot)}\n\n`);
  }

  private broadcast(job: JobProgress) {
    if (!this.sseClients.size) return;
    const now = Date.now();
    if (this.lastBroadcast[job.id] && now - this.lastBroadcast[job.id] < 150) return; // throttle
    this.lastBroadcast[job.id] = now;
    const payload = { ...job };
    for (const client of this.sseClients) {
      try {
        client.write('event: job\n');
        client.write(`data: ${JSON.stringify(payload)}\n\n`);
      } catch {/* ignore */}
    }
  }

  constructor(@InjectRepository(YoutubeJobEntity) private repo: Repository<YoutubeJobEntity>) {}

  getJob(id: string): JobProgress | undefined {
    return this.jobs.get(id);
  }

  listJobs(): JobProgress[] {
    return Array.from(this.jobs.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  private async persistAndCache(id: string, patch: Partial<JobProgress & { error?: string }>) {
    const current = this.jobs.get(id);
    if (!current) return;
    const updated: JobProgress = { ...current, ...patch, updatedAt: Date.now() };
    this.jobs.set(id, updated);
    const entityPatch: Partial<YoutubeJobEntity> = {
      state: updated.state as any,
      progress: Math.round(updated.percent),
      message: updated.message,
      updatedAt: updated.updatedAt,
      stagePercent: updated.stagePercent ? Math.round(updated.stagePercent) : 0,
      outputFile: updated.result?.fileName,
      title: updated.title || updated.result?.title,
      durationSeconds: updated.durationSeconds || updated.result?.durationSeconds,
  thumbnailUrl: updated.thumbnailUrl,
  author: updated.author,
      errorMessage: updated.error,
      downloadPercent: updated.downloadPercent !== undefined ? Math.round(updated.downloadPercent) : undefined,
      convertPercent: updated.convertPercent !== undefined ? Math.round(updated.convertPercent) : undefined,
    };
    await this.repo.update(id, entityPatch);
    this.broadcast(updated);
  }

  async onModuleInit() {
    const rows = await this.repo.find();
    for (const r of rows) {
      const job: JobProgress = {
        id: r.id,
        state: r.state as any,
  percent: r.progress,
  stagePercent: r.stagePercent,
  downloadPercent: r.downloadPercent,
  convertPercent: r.convertPercent,
        message: r.message || undefined,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt || r.createdAt,
        url: r.url,
        title: r.title || undefined,
        durationSeconds: r.durationSeconds || undefined,
  thumbnailUrl: (r as any).thumbnailUrl || undefined,
  author: (r as any).author || undefined,
        result: r.outputFile ? { fileName: r.outputFile, path: join(this.mediaDir, r.outputFile), sizeBytes: 0, title: r.title, durationSeconds: r.durationSeconds } : undefined
      };
      if (['downloading', 'converting', 'pending'].includes(r.state)) {
        job.state = 'queued';
        job.message = 'Reencolado tras reinicio';
        await this.repo.update(r.id, { state: 'queued', message: job.message });
      }
      this.jobs.set(r.id, job);
    }
  }

  startMp3Job(url: string): string {
    if (!this.cleanupTimer) {
      this.cleanupTimer = setInterval(() => this.cleanup(), 15 * 60 * 1000).unref();
    }
    const id = randomUUID();
    const now = Date.now();
    this.jobs.set(id, { id, state: 'queued', percent: 0, createdAt: now, updatedAt: now, url, message: 'En cola (manual)' });
    this.repo.insert({ id, url, state: 'queued', createdAt: now, updatedAt: now, title: undefined, durationSeconds: undefined, outputFile: undefined, errorMessage: null, progress: 0, downloadProgress: 0, convertProgress: 0, message: 'En cola (manual)', stagePercent: 0 });
    return id;
  }

  enqueueMp3Job(url: string): string {
    if (!this.cleanupTimer) {
      this.cleanupTimer = setInterval(() => this.cleanup(), 15 * 60 * 1000).unref();
    }
    const id = randomUUID();
    const now = Date.now();
    this.jobs.set(id, { id, state: 'queued', percent: 0, createdAt: now, updatedAt: now, url, message: 'En cola (metadata...)' });
    this.repo.insert({ id, url, state: 'queued', createdAt: now, updatedAt: now, title: undefined, durationSeconds: undefined, outputFile: undefined, errorMessage: null, progress: 0, downloadProgress: 0, convertProgress: 0, message: 'En cola (metadata...)', stagePercent: 0 });
    // Prefetch metadata asynchronously so title/duration appear antes de iniciar descarga real
    (async () => {
      try {
        const info = await ytdl.getInfo(url);
        const title = info.videoDetails.title;
        const durationSeconds = Number(info.videoDetails.lengthSeconds || '0') || undefined;
        const author = info.videoDetails.author?.name || (info.videoDetails.ownerChannelName) || undefined;
        const thumb = (info.videoDetails.thumbnails || []).sort((a,b)=> (b.width*b.height)-(a.width*a.height))[0]?.url;
        this.persistAndCache(id, { title, durationSeconds, author, thumbnailUrl: thumb, message: 'En cola' });
      } catch (e) {
        // ignoramos errores de metadata aquí para no romper la cola; se reintentará al iniciar
        this.persistAndCache(id, { message: 'En cola' });
      }
    })();
    return id;
  }

  startQueuedJob(id: string): void {
    const job = this.jobs.get(id);
    if (!job) throw new BadRequestException('Job no existe');
    if (job.state !== 'queued') throw new BadRequestException('Job no está en cola');
    this.persistAndCache(id, { state: 'pending', message: 'Inicializando...' });
    this.tryStartJob(id);
  }

  cancelJob(id: string): void {
    const job = this.jobs.get(id);
    if (!job) throw new BadRequestException('Job no existe');
    if (['done', 'error', 'canceled'].includes(job.state)) return;
    const ctrl = this.controllers.get(id);
    try { ctrl?.audioStream?.destroy(); } catch {}
    try { ctrl?.ffmpeg?.kill('SIGKILL'); } catch {}
    try { ctrl?.writeStream?.destroy(); } catch {}
    // eliminar archivo temporal si existe
    try {
      const fs = require('node:fs');
      const tempGlob = (name: string) => name.includes(id) && name.endsWith('.download');
      if (fs.existsSync(this.mediaDir)) {
        for (const f of fs.readdirSync(this.mediaDir)) {
          if (tempGlob(f)) {
            try { fs.unlinkSync(join(this.mediaDir, f)); } catch {}
          }
        }
      }
    } catch {}
    this.controllers.delete(id);
    this.persistAndCache(id, { state: 'canceled', message: 'Cancelado', percent: 100 });
    if (this.currentRunning > 0) this.currentRunning = Math.max(0, this.currentRunning - 1);
  }

  deleteJob(id: string): boolean {
    return this.jobs.delete(id);
  }

  deleteJobFile(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job || !job.result) return false;
    try {
      if (existsSync(job.result.path)) require('node:fs').unlinkSync(job.result.path);
  this.persistAndCache(id, { message: 'Archivo eliminado', result: undefined, state: job.state === 'done' ? 'done' : job.state });
      return true;
    } catch {
      return false;
    }
  }

  deleteJobAndFile(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    if (job.result && existsSync(job.result.path)) {
      try { require('node:fs').unlinkSync(job.result.path); } catch { /* ignore */ }
    }
    this.jobs.delete(id);
    // También eliminar en DB (registro)
    this.repo.delete(id).catch(() => {});
    return true;
  }

  forceDelete(id: string): boolean {
    const job = this.jobs.get(id);
    if (!job) return false;
    // Cancelar si está en progreso
    if (!['done','error','canceled'].includes(job.state)) {
      try { this.cancelJob(id); } catch { /* ignore */ }
    }
    return this.deleteJobAndFile(id);
  }

  private async processMp3Job(id: string, url: string) {
  this.persistAndCache(id, { state: 'downloading', message: 'Obteniendo info...' });
    let info;
    try {
      info = await ytdl.getInfo(url);
    } catch (e: any) {
      if (e && /extract functions/i.test(e.message)) {
        throw new BadRequestException('YouTube cambió su página, intenta más tarde (firma no extraída)');
      }
      throw e;
    }
    // Persist early metadata (title & duration) so UI can display it while downloading
    try {
      const earlyTitle = info.videoDetails.title;
      const earlyDuration = Number(info.videoDetails.lengthSeconds || '0') || undefined;
      const author = info.videoDetails.author?.name || (info.videoDetails.ownerChannelName) || undefined;
      const thumb = (info.videoDetails.thumbnails || []).sort((a,b)=> (b.width*b.height)-(a.width*a.height))[0]?.url;
      this.persistAndCache(id, { title: earlyTitle, durationSeconds: earlyDuration, author, thumbnailUrl: thumb });
    } catch {/* ignore */}
    const titleSlug = info.videoDetails.title.replace(/[^a-z0-9]+/gi, '-').slice(0, 60).replace(/^-|-$/g, '').toLowerCase();
    const fileName = `${titleSlug || 'audio'}-${id}.mp3`;
    const outputPath = join(this.mediaDir, fileName);
    const tempPath = join(this.mediaDir, `${titleSlug || 'audio'}-${id}.download`);

    let finished = false;

    const bail = (err: Error, context: string) => {
      if (finished) return;
      finished = true;
      this.persistAndCache(id, { state: 'error', error: `${context}: ${err.message}`, message: 'Error', percent: 100 });
      try { this.controllers.get(id)?.audioStream?.destroy(); } catch {}
      try { this.controllers.get(id)?.ffmpeg?.kill('SIGKILL'); } catch {}
      try { this.controllers.get(id)?.writeStream?.destroy(); } catch {}
      this.controllers.delete(id);
      if (this.currentRunning > 0) this.currentRunning = Math.max(0, this.currentRunning - 1);
    };

    // 1) Descargar completamente el audio a archivo temporal
    const audioStream = ytdl(url, { quality: 'highestaudio', filter: 'audioonly' });
    const tempWrite = createWriteStream(tempPath);
    this.controllers.set(id, { audioStream, writeStream: tempWrite });
    const totalUnknownFallbackStart = Date.now();
    audioStream.on('progress', (_chunk: number, downloaded: number, total: number) => {
      const job = this.getJob(id);
      if (!job || job.state === 'canceled') {
        try { audioStream.destroy(); } catch {}
        return;
      }
      let downloadRatio = total ? (downloaded / total) : ((Date.now() - totalUnknownFallbackStart) / 30000);
      if (downloadRatio > 1) downloadRatio = 1;
      const downloadPercent = downloadRatio * 100;
      let downloadEtaSeconds: number | undefined;
      if (total && downloaded > 0) {
        const elapsed = (Date.now() - totalUnknownFallbackStart) / 1000;
        const rate = downloaded / elapsed; // bytes/s
        const remaining = total - downloaded;
        if (rate > 0) downloadEtaSeconds = remaining / rate;
      }
      this.persistAndCache(id, { state: 'downloading', percent: downloadPercent * 0.5, stagePercent: downloadPercent, downloadPercent, message: 'Descargando audio...', downloadEtaSeconds });
    });
    audioStream.on('error', e => bail(e, 'Error stream YouTube'));
    tempWrite.on('error', e => bail(e, 'Error escritura archivo'));
    tempWrite.on('finish', () => {
      const job = this.getJob(id);
      if (!job || job.state === 'canceled') return;
      // Aseguramos marcar descarga completa al iniciar conversión
      this.persistAndCache(id, { state: 'converting', message: 'Convirtiendo...', stagePercent: 0, convertPercent: 0, percent: 50, downloadPercent: 100 });
      // 2) Iniciar conversión desde archivo temporal
      const ff = ffmpeg(tempPath)
        .audioBitrate(128)
        .toFormat('mp3')
        .on('progress', (p: any) => {
          const job2 = this.getJob(id);
          if (!job2 || job2.state === 'canceled') return;
            let convPercent: number | undefined = undefined;
            if (p?.percent && Number.isFinite(p.percent)) {
              convPercent = Math.min(100, Math.max(0, p.percent));
            } else if (p?.timemark && info?.videoDetails?.lengthSeconds) {
              // Derivar usando timemark (HH:MM:SS.xx)
              const tm = p.timemark as string;
              const parts = tm.split(':').map(Number);
              if (parts.length === 3 && parts.every(n => Number.isFinite(n))) {
                const secs = parts[0] * 3600 + parts[1] * 60 + parts[2];
                const total = Number(info.videoDetails.lengthSeconds) || 0;
                if (total > 0) convPercent = Math.min(100, (secs / total) * 100);
              }
            }
            if (convPercent === undefined) convPercent = 0;
            const global = 50 + (convPercent * 0.5); // 50-100
            // No bajar global si por alguna razón convPercent retrocede
            const safeGlobal = Math.max(job2.percent, global);
            let convertEtaSeconds: number | undefined;
            if (info?.videoDetails?.lengthSeconds && convPercent > 0 && convPercent < 100) {
              const totalSecs = Number(info.videoDetails.lengthSeconds) || 0;
              const doneSecs = (convPercent / 100) * totalSecs;
              let elapsedSecs: number | undefined;
              if (p?.timemark) {
                const tp = (p.timemark as string).split(':').map(Number);
                if (tp.length === 3 && tp.every(n => Number.isFinite(n))) elapsedSecs = tp[0] * 3600 + tp[1] * 60 + tp[2];
              }
              if (!elapsedSecs || elapsedSecs <= 0) elapsedSecs = doneSecs;
              const rate = doneSecs / elapsedSecs;
              const remainingSecs = totalSecs - doneSecs;
              if (rate > 0) convertEtaSeconds = remainingSecs / rate;
            }
            this.persistAndCache(id, { state: 'converting', percent: safeGlobal, stagePercent: convPercent, convertPercent: convPercent, message: 'Convirtiendo...', convertEtaSeconds });
        })
        .on('error', (err: Error) => bail(err, 'Error en conversión'))
        .on('end', () => {
          if (finished) return;
          finished = true;
          const job2 = this.getJob(id);
          if (job2 && job2.state === 'canceled') return;
          try {
            const sizeBytes = require('node:fs').statSync(outputPath).size;
            const durationSeconds = Number(info.videoDetails.lengthSeconds || '0') || undefined;
            const result: ConversionResult = { fileName, path: outputPath, sizeBytes, title: info.videoDetails.title, durationSeconds };
            const author = info.videoDetails.author?.name || (info.videoDetails.ownerChannelName) || undefined;
            const thumb = (info.videoDetails.thumbnails || []).sort((a,b)=> (b.width*b.height)-(a.width*a.height))[0]?.url;
            this.persistAndCache(id, { state: 'done', percent: 100, result, message: 'Completado', downloadPercent: 100, convertPercent: 100, title: info.videoDetails.title, durationSeconds, author, thumbnailUrl: thumb });
          } catch (e: any) {
            bail(e, 'Error finalizando');
          } finally {
            // cleanup temp
            try { require('node:fs').unlinkSync(tempPath); } catch {}
          }
        })
        .on('close', () => {
          this.controllers.delete(id);
          if (this.currentRunning > 0) this.currentRunning = Math.max(0, this.currentRunning - 1);
        })
        .save(outputPath);
      const ctrl = this.controllers.get(id) || {};
      this.controllers.set(id, { ...ctrl, ffmpeg: ff });
    });

    audioStream.pipe(tempWrite);
  }

  private canStartMore(): boolean {
    return this.currentRunning < this.maxConcurrent;
  }

  private tryStartJob(id: string) {
    const job = this.jobs.get(id);
    if (!job) return;
    if (!this.canStartMore()) {
  if (job.state === 'pending') this.persistAndCache(id, { state: 'queued', message: 'Esperando turno' });
      return;
    }
    if (['pending', 'queued'].includes(job.state)) {
  this.persistAndCache(id, { state: 'downloading', message: 'Obteniendo info...' });
      this.currentRunning += 1;
      this.processMp3Job(id, job.url!).catch(err => {
        this.persistAndCache(id, { state: 'error', error: err instanceof Error ? err.message : String(err), percent: 100 });
        if (this.currentRunning > 0) this.currentRunning = Math.max(0, this.currentRunning - 1);
      });
    }
  }
  // En modo manual no se auto-desencola; el usuario debe iniciar cada job.

  private cleanup() {
    const now = Date.now();
    // Limpiar jobs viejos
    for (const [id, job] of this.jobs.entries()) {
      if (now - job.createdAt > this.jobTtlMs) {
        this.jobs.delete(id);
      }
    }
    // Limpiar archivos antiguos
    try {
      const dir = this.mediaDir;
      if (!existsSync(dir)) return;
      const entries = require('node:fs').readdirSync(dir);
      for (const name of entries) {
        const full = join(dir, name);
        try {
          const stat = require('node:fs').statSync(full);
          if (now - stat.mtimeMs > this.fileTtlMs) {
            require('node:fs').unlinkSync(full);
            this.logger.verbose(`Limpieza: archivo eliminado ${name}`);
          }
        } catch { /* noop */ }
      }
    } catch (e) {
      this.logger.debug('Error en limpieza: ' + (e as Error).message);
    }
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
