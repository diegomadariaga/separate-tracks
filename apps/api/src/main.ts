import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './modules/app.module';
import { json } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });
  app.use(json({ limit: '50mb' }));
  await app.listen(3000);
  console.log('API escuchando en http://localhost:3000');
}
bootstrap();
