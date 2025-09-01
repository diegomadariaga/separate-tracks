import { Controller, Post, Body, Get, Param, NotFoundException, Res, Delete } from '@nestjs/common';
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
      title: result.title,
      durationSeconds: result.durationSeconds,
      downloadUrl: `/youtube/download/${encodeURIComponent(result.fileName)}`
    };
  }

  @Post('raw')
  async raw(@Body() dto: DownloadYoutubeDto) {
    const result = await this.youtube.downloadAudioRaw(dto.url);
    return {
      file: result.fileName,
      sizeBytes: result.sizeBytes,
      format: result.format,
      downloadUrl: `/youtube/download/${encodeURIComponent(result.fileName)}`
    };
  }

  @Post('mp3/async')
  async startAsync(@Body() dto: DownloadYoutubeDto) {
    const jobId = this.youtube.startMp3Job(dto.url);
    return { jobId };
  }

  @Post('mp3/enqueue')
  async enqueue(@Body() dto: DownloadYoutubeDto) {
    const jobId = this.youtube.enqueueMp3Job(dto.url);
    return { jobId };
  }

  @Get('jobs')
  async listJobs() {
    return this.youtube.listJobs().map(j => ({
      id: j.id,
      state: j.state,
      percent: Number(j.percent.toFixed(2)),
      downloadPercent: j.downloadPercent != null ? Number(j.downloadPercent.toFixed(2)) : undefined,
      convertPercent: j.convertPercent != null ? Number(j.convertPercent.toFixed(2)) : undefined,
      message: j.message,
      file: j.result?.fileName,
      title: j.title || j.result?.title,
      durationSeconds: j.durationSeconds || j.result?.durationSeconds,
      hasFile: !!j.result,
      createdAt: j.createdAt,
      updatedAt: j.updatedAt
    }));
  }

  @Post('job/:id/start')
  async startJob(@Param('id') id: string) {
    this.youtube.startQueuedJob(id);
    return { ok: true };
  }

  @Post('job/:id/cancel')
  async cancelJob(@Param('id') id: string) {
    this.youtube.cancelJob(id);
    return { ok: true };
  }

  @Delete('job/:id')
  async deleteJob(@Param('id') id: string) {
    const deleted = this.youtube.deleteJob(id);
    if (!deleted) throw new NotFoundException('Job no encontrado');
    return { ok: true };
  }

  @Delete('job/:id/file')
  async deleteJobFile(@Param('id') id: string) {
    const ok = this.youtube.deleteJobFile(id);
    if (!ok) throw new NotFoundException('Archivo/job no encontrado');
    return { ok: true };
  }

  @Delete('job/:id/all')
  async deleteJobAndFile(@Param('id') id: string) {
    const ok = this.youtube.deleteJobAndFile(id);
    if (!ok) throw new NotFoundException('Job no encontrado');
    return { ok: true };
  }

  @Delete('job/:id/force')
  async forceDelete(@Param('id') id: string) {
    const ok = this.youtube.forceDelete(id);
    if (!ok) throw new NotFoundException('Job no encontrado');
    return { ok: true };
  }

  @Get('progress/:id')
  async progress(@Param('id') id: string) {
    const job = this.youtube.getJob(id);
    if (!job) throw new NotFoundException('Job no encontrado');
    const base: any = {
      id: job.id,
      state: job.state,
      percent: Number(job.percent.toFixed(2)),
      message: job.message,
  stagePercent: job.stagePercent != null ? Number(job.stagePercent.toFixed(2)) : undefined,
      downloadPercent: job.downloadPercent != null ? Number(job.downloadPercent.toFixed(2)) : undefined,
      convertPercent: job.convertPercent != null ? Number(job.convertPercent.toFixed(2)) : undefined,
      title: job.title || job.result?.title,
      durationSeconds: job.durationSeconds || job.result?.durationSeconds,
    };
    if (job.state === 'done' && job.result) {
      base.result = {
        file: job.result.fileName,
        sizeBytes: job.result.sizeBytes,
        title: job.result.title,
        durationSeconds: job.result.durationSeconds,
        downloadUrl: `/youtube/download/${encodeURIComponent(job.result.fileName)}`
      };
    }
    if (job.state === 'error') base.error = job.error;
    return base;
  }

  @Get('download/:file')
  async download(@Param('file') file: string, @Res() res: Response) {
    const mediaDir = join(process.cwd(), 'media');
    const filePath = join(mediaDir, file);
    if (!existsSync(filePath)) throw new NotFoundException('Archivo no encontrado');
    const stat = statSync(filePath);
    const ext = file.split('.').pop()?.toLowerCase();
    const mime = (
      ext === 'mp3' ? 'audio/mpeg' :
      ext === 'm4a' ? 'audio/mp4' :
      ext === 'webm' ? 'audio/webm' :
      'application/octet-stream'
    );
    res.setHeader('Content-Type', mime);
    res.setHeader('Content-Length', stat.size.toString());
    res.setHeader('Content-Disposition', `attachment; filename="${file}"`);
    const stream = createReadStream(filePath);
    stream.pipe(res);
  }
}
