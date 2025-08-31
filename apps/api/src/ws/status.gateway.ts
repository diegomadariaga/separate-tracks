import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { Server } from 'ws';
import { DbService } from '../upload/db.service';

@WebSocketGateway({ path: '/ws/status', cors: { origin: '*' } })
export class StatusGateway {
  @WebSocketServer()
  server!: Server;

  constructor(private db: DbService) {}

  broadcastStatus() {
    const payload = JSON.stringify({ type: 'status', data: this.db.list() });
    this.server?.clients?.forEach(c => {
      // @ts-ignore
      if (c.readyState === 1) c.send(payload);
    });
  }
}
