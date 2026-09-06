import { Module } from '@nestjs/common';
import { EvaluationController } from './evaluation.controller';
import { EvaluationService } from './evaluation.service';
import { TradeEvaluationEngine } from './engines/trade-evaluation.engine';
import { PriceFractionService } from './services/price-fraction.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EvaluationController],
  providers: [EvaluationService, TradeEvaluationEngine, PriceFractionService],
  exports: [EvaluationService, TradeEvaluationEngine, PriceFractionService],
})
export class EvaluationModule {}
