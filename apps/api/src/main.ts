import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import { json } from 'express';
import { WebSocketServer } from 'ws';
import { DbService } from './upload/db.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.use(json({ limit: '50mb' }));
  await app.listen(3000);
  console.log('API escuchando en http://localhost:3000');

  const server = app.getHttpServer();
  const wss = new WebSocketServer({ server, path: '/ws/status' });
  const db = app.get(DbService);
  function broadcastStatuses() {
    const payload = JSON.stringify({ type: 'status', data: db.list() });
    wss.clients.forEach((c: any) => { if (c.readyState === 1) c.send(payload); });
  }
  // Expose global for QueueService
  // @ts-ignore
  globalThis.__broadcastStatuses = broadcastStatuses;
  wss.on('connection', (socket: any) => {
    socket.send(JSON.stringify({ type: 'status', data: db.list() }));
  });
}
bootstrap();
