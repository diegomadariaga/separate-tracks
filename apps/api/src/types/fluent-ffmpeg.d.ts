// Minimal type declarations for fluent-ffmpeg used in this project
// If @types/fluent-ffmpeg starts working, this file can be removed.
declare module 'fluent-ffmpeg' {
  import { Readable, Writable } from 'stream';
  import { EventEmitter } from 'events';

  interface FfmpegCommand extends EventEmitter {
    audioBitrate(bitrate: number | string): FfmpegCommand;
    audioFilters(filters: string | string[] | Array<string | { filter: string; options?: string | string[] | Record<string, any> }>): FfmpegCommand;
    toFormat(format: string): FfmpegCommand;
    save(output: string): FfmpegCommand;
    on(event: 'error', handler: (err: Error) => void): FfmpegCommand;
    on(event: 'end', handler: () => void): FfmpegCommand;
    on(event: 'start', handler: (commandLine: string) => void): FfmpegCommand;
    on(event: 'progress', handler: (progress: { frames?: number; currentFps?: number; currentKbps?: number; targetSize?: number; timemark?: string; percent?: number }) => void): FfmpegCommand;
    on(event: 'close', handler: () => void): FfmpegCommand;
    pipe(stream: Writable, options?: { end?: boolean }): Writable;
    kill(signal?: string): FfmpegCommand;
  }

  function ffmpeg(input?: string | Readable): FfmpegCommand;
  namespace ffmpeg {
    function setFfmpegPath(path: string): void;
  }
  export = ffmpeg;
  export default ffmpeg;
}