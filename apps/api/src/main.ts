import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module.js';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: true, credentials: false });
  const basePort = Number(process.env.PORT) || 3000;
  const maxAttempts = 10;
  let port = basePort;
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await app.listen(port);
      // eslint-disable-next-line no-console
      console.log(`API listening on http://localhost:${port}`);
      if (port !== basePort) {
        // eslint-disable-next-line no-console
        console.log(`(Puerto original ${basePort} en uso, usando fallback)`);
      }
      return;
    } catch (err: any) {
      if (err?.code === 'EADDRINUSE') {
        port += 1; // probar siguiente
      } else {
        throw err;
      }
    }
  }
  // eslint-disable-next-line no-console
  console.error(`No se pudo encontrar un puerto libre desde ${basePort}`);
}
bootstrap();
