import { Entity, PrimaryColumn, Column, Index } from 'typeorm';

export type JobState = 'queued' | 'pending' | 'downloading' | 'converting' | 'done' | 'error' | 'canceled';

@Entity({ name: 'youtube_jobs' })
export class YoutubeJobEntity {
  @PrimaryColumn()
  id!: string;

  @Column()
  url!: string;

  @Column({ nullable: true })
  title?: string;

  @Column({ nullable: true })
  durationSeconds?: number;

  @Column({ nullable: true })
  outputFile?: string;

  @Column({ type: 'text', nullable: true })
  errorMessage?: string | null;

  @Column({ type: 'varchar' })
  state!: JobState;

  @Column({ type: 'int', default: 0 })
  progress!: number;

  @Column({ type: 'int', default: 0 })
  downloadProgress!: number;

  @Column({ type: 'int', default: 0 })
  convertProgress!: number;

  @Column({ type: 'int', default: 0 })
  downloadPercent?: number;

  @Column({ type: 'int', default: 0 })
  convertPercent?: number;

  @Column({ type: 'varchar', nullable: true })
  message?: string;

  @Index()
  @Column({ type: 'bigint' })
  createdAt!: number; // epoch ms

  @Index()
  @Column({ type: 'bigint', nullable: true })
  updatedAt?: number;

  @Index()
  @Column({ type: 'bigint', nullable: true })
  startedAt?: number;

  @Column({ type: 'int', default: 0 })
  stagePercent?: number;

  @Column({ type: 'bigint', nullable: true })
  completedAt?: number;
}
