import { Module } from '@nestjs/common';
import { AutomationService } from './automation.service';
import { AutomationScheduler } from './automation.scheduler';
import { AutomationController } from './automation.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { MarketDataModule } from '../market-data/market-data.module';
import { EvaluationModule } from '../evaluation/evaluation.module';
import { ResultsModule } from '../results/results.module';
import { StocksModule } from '../stocks/stocks.module';

@Module({
  imports: [
    PrismaModule,
    MarketDataModule,
    EvaluationModule,
    ResultsModule,
    StocksModule,
  ],
  controllers: [AutomationController],
  providers: [AutomationService, AutomationScheduler],
  exports: [AutomationService],
})
export class AutomationModule {}
