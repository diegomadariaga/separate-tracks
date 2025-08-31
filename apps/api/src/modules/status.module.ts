import { Module } from '@nestjs/common';
import { DbService } from '../upload/db.service';
import { StatusController } from './status.controller';

@Module({
  controllers: [StatusController],
  providers: [DbService],
  exports: [DbService]
})
export class StatusModule {}
