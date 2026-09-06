import { Test, TestingModule } from '@nestjs/testing';
import { DashboardService } from './dashboard.service';
import { PrismaService } from '../prisma/prisma.service';

describe('DashboardService', () => {
  let service: DashboardService;

  const mockPrismaService = {
    tournament: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    participant: {
      count: jest.fn(),
    },
    stockPick: {
      count: jest.fn(),
    },
    tradeEvaluation: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    stock: {
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should aggregate metrics and summaries correctly', async () => {
    // Mock count calls in order
    mockPrismaService.tournament.count
      .mockResolvedValueOnce(2) // active
      .mockResolvedValueOnce(5); // total
    mockPrismaService.participant.count.mockResolvedValueOnce(15);
    mockPrismaService.stockPick.count.mockResolvedValueOnce(45);
    mockPrismaService.tradeEvaluation.count
      .mockResolvedValueOnce(40) // completed
      .mockResolvedValueOnce(2); // pending reviews
    mockPrismaService.stock.count.mockResolvedValueOnce(30);

    const now = new Date('2026-09-01T00:00:00.000Z');
    mockPrismaService.tournament.findMany.mockResolvedValueOnce([
      {
        id: 'tour-1',
        name: 'Tournament Alpha',
        startDate: now,
        endDate: new Date('2026-09-30T00:00:00.000Z'),
        status: 'ACTIVE',
        _count: {
          participants: 10,
          picks: 30,
        },
      },
    ]);

    mockPrismaService.tradeEvaluation.findMany.mockResolvedValueOnce([
      {
        id: 'eval-1',
        entryPrice: 1000,
        exitPrice: 1050,
        realizedReturn: 5.0,
        exitReason: 'MARKET_CLOSE',
        status: 'COMPLETED',
        pick: {
          tradingDate: now,
          tournament: { id: 'tour-1', name: 'Tournament Alpha' },
          participant: { name: 'Budi' },
          stock: { symbol: 'BBCA' },
        },
      },
    ]);

    const result = await service.getDashboardStats();

    expect(result.metrics.activeTournamentsCount).toBe(2);
    expect(result.metrics.totalTournamentsCount).toBe(5);
    expect(result.metrics.totalParticipantsCount).toBe(15);
    expect(result.metrics.totalPicksCount).toBe(45);
    expect(result.metrics.completedEvaluationsCount).toBe(40);
    expect(result.metrics.pendingReviewsCount).toBe(2);
    expect(result.metrics.totalStocksCount).toBe(30);

    expect(result.activeTournaments).toHaveLength(1);
    expect(result.activeTournaments[0].name).toBe('Tournament Alpha');
    expect(result.activeTournaments[0].participantsCount).toBe(10);

    expect(result.recentEvaluations).toHaveLength(1);
    expect(result.recentEvaluations[0].stockSymbol).toBe('BBCA');
    expect(result.recentEvaluations[0].realizedReturn).toBe(5.0);
  });
});
