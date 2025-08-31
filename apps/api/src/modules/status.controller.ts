import { Controller, Get } from '@nestjs/common';
import { DbService } from '../upload/db.service';

@Controller('files')
export class StatusController {
  constructor(private db: DbService) {}

  @Get()
  list() {
    return this.db.list();
  }
}
