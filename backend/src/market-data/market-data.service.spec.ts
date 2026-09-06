import { Test, TestingModule } from '@nestjs/testing';
import { MarketDataService } from './market-data.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  MARKET_DATA_PROVIDER,
  MarketDataProvider,
} from './interfaces/market-data-provider.interface';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { SyncStatus } from '@prisma/client';

describe('MarketDataService', () => {
  let service: MarketDataService;
  let prismaService: any;
  let mockProvider: MarketDataProvider;

  const mockTournament = {
    id: 'tournament-uuid-1',
    name: 'Turnamen BSJP',
    startDate: new Date('2026-09-01T00:00:00.000Z'),
    endDate: new Date('2026-09-30T23:59:59.000Z'),
  };

  const mockStockBBCA = {
    id: 'stock-bbca',
    symbol: 'BBCA',
    name: 'Bank Central Asia Tbk',
    isActive: true,
  };

  const mockStockBBRI = {
    id: 'stock-bbri',
    symbol: 'BBRI',
    name: 'Bank Rakyat Indonesia Tbk',
    isActive: true,
  };

  // 4 picks across 2 unique stocks (BBCA x2, BBRI x2)
  const mockPicks = [
    {
      id: 'pick-1',
      participantId: 'p-1',
      stockId: 'stock-bbca',
      stock: mockStockBBCA,
      tradingDate: new Date('2026-09-05T00:00:00.000Z'),
    },
    {
      id: 'pick-2',
      participantId: 'p-2',
      stockId: 'stock-bbca',
      stock: mockStockBBCA,
      tradingDate: new Date('2026-09-05T00:00:00.000Z'),
    },
    {
      id: 'pick-3',
      participantId: 'p-3',
      stockId: 'stock-bbri',
      stock: mockStockBBRI,
      tradingDate: new Date('2026-09-05T00:00:00.000Z'),
    },
    {
      id: 'pick-4',
      participantId: 'p-4',
      stockId: 'stock-bbri',
      stock: mockStockBBRI,
      tradingDate: new Date('2026-09-05T00:00:00.000Z'),
    },
  ];

  const mockCandles = [
    {
      symbol: 'BBCA',
      tradingDate: '2026-09-05',
      timestamp: new Date('2026-09-05T02:00:00.000Z'),
      open: 10000,
      high: 10050,
      low: 9950,
      close: 10020,
      volume: 5000n,
      provider: 'mock',
    },
  ];

  beforeEach(async () => {
    mockProvider = {
      providerName: 'mock',
      getIntradayCandles: jest.fn().mockResolvedValue(mockCandles),
    };

    prismaService = {
      tournament: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === mockTournament.id) return mockTournament;
          return null;
        }),
      },
      stockPick: {
        findMany: jest.fn().mockResolvedValue(mockPicks),
      },
      marketSyncRun: {
        create: jest.fn().mockResolvedValue({
          id: 'sync-run-1',
          tournamentId: mockTournament.id,
          status: SyncStatus.RUNNING,
          totalSymbols: 2,
        }),
        update: jest.fn().mockImplementation(({ data }) => ({
          id: 'sync-run-1',
          ...data,
        })),
        findMany: jest.fn().mockResolvedValue([]),
        findUnique: jest
          .fn()
          .mockResolvedValue({ id: 'sync-run-1', items: [] }),
      },
      marketSyncItem: {
        upsert: jest.fn().mockResolvedValue({ id: 'sync-item-1' }),
        update: jest.fn().mockResolvedValue({ id: 'sync-item-1' }),
      },
      intradayCandle: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue(mockCandles),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MarketDataService,
        { provide: PrismaService, useValue: prismaService },
        { provide: MARKET_DATA_PROVIDER, useValue: mockProvider },
      ],
    }).compile();

    service = module.get<MarketDataService>(MarketDataService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('triggerSync', () => {
    it('should successfully sync unique symbols once and mark status as SUCCESS', async () => {
      const result = await service.triggerSync(mockTournament.id, {
        tradingDate: '2026-09-05',
      });

      expect(result).toBeDefined();
      expect(result.status).toBe(SyncStatus.SUCCESS);
      expect(result.syncedCount).toBe(2); // BBCA and BBRI
      expect(result.failedCount).toBe(0);

      // Unique Symbol Strategy verification: Provider must only be called twice, NOT 4 times!
      expect(mockProvider.getIntradayCandles).toHaveBeenCalledTimes(2);
      expect(prismaService.intradayCandle.createMany).toHaveBeenCalledTimes(2);
    });

    it('should throw NotFoundException if tournament not found', async () => {
      prismaService.tournament.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.triggerSync('non-existent-id', {
          tradingDate: '2026-09-05',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if trading date is outside tournament bounds', async () => {
      await expect(
        service.triggerSync(mockTournament.id, {
          tradingDate: '2026-10-15', // Tournament ends 2026-09-30
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if no picks exist for the date', async () => {
      prismaService.stockPick.findMany.mockResolvedValueOnce([]);

      await expect(
        service.triggerSync(mockTournament.id, {
          tradingDate: '2026-09-05',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCandles', () => {
    it('should return stored candles for a symbol', async () => {
      const result = await service.getCandles('BBCA', '2026-09-05');
      expect(result).toHaveLength(1);
      expect(prismaService.intradayCandle.findMany).toHaveBeenCalled();
    });
  });
});
