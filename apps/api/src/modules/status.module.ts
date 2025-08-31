import { Module } from '@nestjs/common';
import { StatusGateway } from '../ws/status.gateway';
import { DbService } from '../upload/db.service';
import { StatusController } from './status.controller';

@Module({
  controllers: [StatusController],
  providers: [StatusGateway, DbService],
  exports: [StatusGateway]
})
export class StatusModule {}
