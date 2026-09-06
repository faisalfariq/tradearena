import { Module } from '@nestjs/common';
import { ResultsController } from './results.controller';
import { ResultsService } from './results.service';
import { PointsEngine } from './engines/points.engine';

@Module({
  controllers: [ResultsController],
  providers: [ResultsService, PointsEngine],
  exports: [ResultsService, PointsEngine],
})
export class ResultsModule {}
