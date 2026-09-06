import { Test, TestingModule } from '@nestjs/testing';
import { AutomationService } from './automation.service';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { EvaluationService } from '../evaluation/evaluation.service';
import { ResultsService } from '../results/results.service';

describe('AutomationService', () => {
  let service: AutomationService;

  const mockPrismaService = {
    tournament: {
      findUnique: jest.fn(),
    },
    stockPick: {
      findMany: jest.fn(),
    },
    tradeEvaluation: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn().mockResolvedValue({ id: 'audit-1' }),
    },
  };

  const mockMarketDataService = {
    triggerSync: jest.fn(),
  };

  const mockEvaluationService = {
    evaluateTournamentDay: jest.fn(),
    evaluatePick: jest.fn(),
  };

  const mockResultsService = {
    recalculateTournamentPoints: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MarketDataService, useValue: mockMarketDataService },
        { provide: EvaluationService, useValue: mockEvaluationService },
        { provide: ResultsService, useValue: mockResultsService },
      ],
    }).compile();

    service = module.get<AutomationService>(AutomationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should orchestrate daily pipeline end-to-end successfully', async () => {
    const now = new Date('2026-09-01T00:00:00.000Z');
    mockPrismaService.tournament.findUnique.mockResolvedValueOnce({
      id: 'tour-1',
      name: 'Tournament Alpha',
      startDate: now,
      rules: {},
    });

    mockPrismaService.stockPick.findMany.mockResolvedValueOnce([
      { id: 'pick-1', stock: { symbol: 'BBCA' }, status: 'CONFIRMED' },
      { id: 'pick-2', stock: { symbol: 'BBRI' }, status: 'CONFIRMED' },
    ]);

    mockMarketDataService.triggerSync.mockResolvedValueOnce({
      id: 'sync-1',
      status: 'SUCCESS',
      syncedCount: 2,
      totalSymbols: 2,
    });

    mockEvaluationService.evaluateTournamentDay.mockResolvedValueOnce({
      tournamentId: 'tour-1',
      tradingDate: '2026-09-01',
      evaluatedCount: 2,
    });

    mockPrismaService.tradeEvaluation.findMany.mockResolvedValueOnce([
      { id: 'eval-1', status: 'COMPLETED' },
      { id: 'eval-2', status: 'COMPLETED' },
    ]);

    mockResultsService.recalculateTournamentPoints.mockResolvedValueOnce({
      tournamentId: 'tour-1',
      recalculatedCount: 2,
      pointsRule: 'PERCENTAGE_RETURN_V1',
    });

    const report = await service.runDailyPipeline(
      'tour-1',
      '2026-09-01',
      'admin-1',
    );

    expect(report.overallStatus).toBe('SUCCESS');
    expect(report.uniqueSymbolsCount).toBe(2);
    expect(report.picksCount).toBe(2);
    expect(report.completedCount).toBe(2);
    expect(report.exceptionsCount).toBe(0);
    expect(report.recalculatedPointsCount).toBe(2);
    expect(report.steps).toHaveLength(4);
    expect(mockPrismaService.auditLog.create).toHaveBeenCalled();
  });

  it('should query exceptions properly', async () => {
    mockPrismaService.tournament.findUnique.mockResolvedValueOnce({
      id: 'tour-1',
      name: 'Tournament Alpha',
    });

    const now = new Date('2026-09-01T00:00:00.000Z');
    mockPrismaService.tradeEvaluation.findMany.mockResolvedValueOnce([
      {
        id: 'eval-ex-1',
        pickId: 'pick-ex-1',
        status: 'REVIEW_REQUIRED',
        entryPrice: 1000,
        exitPrice: null,
        realizedReturn: null,
        exitReason: null,
        createdAt: now,
        pick: {
          participantId: 'part-1',
          tradingDate: now,
          participant: { name: 'Budi' },
          stock: { symbol: 'BBRI' },
        },
      },
    ]);

    const result = await service.getExceptions('tour-1', '2026-09-01');

    expect(result.totalExceptions).toBe(1);
    expect(result.reviewRequiredCount).toBe(1);
    expect(result.items[0].stockSymbol).toBe('BBRI');
  });

  it('should retry evaluation and recalculate points if completed', async () => {
    const now = new Date('2026-09-01T00:00:00.000Z');
    mockPrismaService.tradeEvaluation.findUnique.mockResolvedValueOnce({
      id: 'eval-1',
      status: 'PENDING_DATA',
      pick: {
        id: 'pick-1',
        tournamentId: 'tour-1',
        tradingDate: now,
        stock: { symbol: 'BBCA' },
      },
    });

    mockMarketDataService.triggerSync.mockResolvedValueOnce({
      status: 'SUCCESS',
    });
    mockEvaluationService.evaluatePick.mockResolvedValueOnce({
      id: 'eval-1',
      status: 'COMPLETED',
      realizedReturn: 1.5,
      exitReason: 'MARKET_CLOSE',
    });
    mockResultsService.recalculateTournamentPoints.mockResolvedValueOnce({
      recalculatedCount: 1,
    });

    const retryRes = await service.retryEvaluation('eval-1', 'admin-1');

    expect(retryRes.newStatus).toBe('COMPLETED');
    expect(mockEvaluationService.evaluatePick).toHaveBeenCalledWith('pick-1');
    expect(mockResultsService.recalculateTournamentPoints).toHaveBeenCalledWith(
      'tour-1',
    );
  });
});
