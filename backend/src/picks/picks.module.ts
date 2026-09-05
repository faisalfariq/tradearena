import { Module } from '@nestjs/common';
import { PicksService } from './picks.service';
import { PicksController } from './picks.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [PicksController],
  providers: [PicksService],
  exports: [PicksService],
})
export class PicksModule {}
