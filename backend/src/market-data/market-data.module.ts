import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { MarketDataService } from './market-data.service';
import { MarketDataController } from './market-data.controller';
import { MockMarketDataProvider } from './providers/mock-market-data.provider';
import { HttpMarketDataProvider } from './providers/http-market-data.provider';
import { MARKET_DATA_PROVIDER } from './interfaces/market-data-provider.interface';

@Module({
  imports: [PrismaModule, ConfigModule],
  controllers: [MarketDataController],
  providers: [
    MarketDataService,
    MockMarketDataProvider,
    HttpMarketDataProvider,
    {
      provide: MARKET_DATA_PROVIDER,
      useFactory: (
        config: ConfigService,
        mockProvider: MockMarketDataProvider,
        httpProvider: HttpMarketDataProvider,
      ) => {
        const providerName = (
          config.get<string>('MARKET_DATA_PROVIDER') || 'mock'
        ).toLowerCase();
        if (providerName === 'http') {
          return httpProvider;
        }
        return mockProvider;
      },
      inject: [ConfigService, MockMarketDataProvider, HttpMarketDataProvider],
    },
  ],
  exports: [MarketDataService, MARKET_DATA_PROVIDER],
})
export class MarketDataModule {}
