import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HealthModule } from './health/health.module';
import { PrismaModule } from './prisma/prisma.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { TournamentsModule } from './tournaments/tournaments.module';
import { StocksModule } from './stocks/stocks.module';
import { ParticipantsModule } from './participants/participants.module';
import { PicksModule } from './picks/picks.module';
import { MarketDataModule } from './market-data/market-data.module';
import { EvaluationModule } from './evaluation/evaluation.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ResultsModule } from './results/results.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { AutomationModule } from './automation/automation.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env', '../.env'],
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    UsersModule,
    AuthModule,
    TournamentsModule,
    StocksModule,
    ParticipantsModule,
    PicksModule,
    MarketDataModule,
    EvaluationModule,
    ResultsModule,
    DashboardModule,
    AutomationModule,
    HealthModule,
  ],
})
export class AppModule {}
