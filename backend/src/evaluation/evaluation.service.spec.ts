import { Test, TestingModule } from '@nestjs/testing';
import { EvaluationService } from './evaluation.service';
import { TradeEvaluationEngine } from './engines/trade-evaluation.engine';
import { PriceFractionService } from './services/price-fraction.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { EvaluationStatus } from '@prisma/client';

describe('EvaluationService', () => {
  let service: EvaluationService;
  let prisma: any;

  const mockPick = {
    id: 'pick-123',
    tournamentId: 'tourney-1',
    stockId: 'stock-1',
    participantId: 'part-1',
    tradingDate: new Date('2026-09-05T00:00:00.000Z'),
    entryPrice: 10000,
    entrySource: 'MARKET_OPEN',
    status: 'CONFIRMED',
    stock: { id: 'stock-1', symbol: 'BBCA' },
    participant: { id: 'part-1', name: 'Budi' },
    tournament: {
      id: 'tourney-1',
      rules: {
        initialStopPct: 0.03,
        trailingStopPct: 0.03,
        candleAmbiguityPolicy: 'CONSERVATIVE_LOSS_FIRST',
        gapPolicy: 'ACTUAL_FIRST_VALID_LEVEL',
        priceFractionPolicy: 'IDX_STANDARD_V1',
        calculationRuleVersion: 'v1.0.0',
        pointsRule: 'PERCENTAGE_RETURN_V1',
      },
    },
  };

  const mockCandle = {
    id: 'candle-1',
    symbol: 'BBCA',
    tradingDate: new Date('2026-09-05T00:00:00.000Z'),
    timestamp: new Date('2026-09-05T02:00:00.000Z'),
    open: 10000,
    high: 10100,
    low: 9900,
    close: 10050,
    volume: 1000n,
    provider: 'canonical',
  };

  beforeEach(async () => {
    prisma = {
      stockPick: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      tournament: {
        findUnique: jest.fn(),
      },
      intradayCandle: {
        findMany: jest.fn(),
      },
      tradeEvaluation: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      tradeEvaluationEvidence: {
        upsert: jest.fn(),
      },
      pointsResult: {
        upsert: jest.fn(),
      },
      evaluationOverride: {
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      auditLog: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EvaluationService,
        TradeEvaluationEngine,
        PriceFractionService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<EvaluationService>(EvaluationService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('evaluatePick', () => {
    it('should throw NotFoundException if pick does not exist', async () => {
      prisma.stockPick.findUnique.mockResolvedValue(null);
      await expect(service.evaluatePick('invalid-id')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should evaluate pick, persist evaluation, evidence, and pointsResult', async () => {
      prisma.stockPick.findUnique.mockResolvedValue(mockPick);
      prisma.intradayCandle.findMany.mockResolvedValue([mockCandle]);

      const mockEvalRecord = {
        id: 'eval-1',
        pickId: mockPick.id,
        status: EvaluationStatus.COMPLETED,
        entryPrice: 10000,
        exitPrice: 10050,
        realizedReturn: 0.5,
      };

      prisma.tradeEvaluation.upsert.mockResolvedValue(mockEvalRecord);
      prisma.tradeEvaluationEvidence.upsert.mockResolvedValue({});
      prisma.pointsResult.upsert.mockResolvedValue({});
      const evalDetail = {
        ...mockEvalRecord,
        pick: mockPick,
        evidence: {},
        pointsResult: {},
      };
      prisma.tradeEvaluation.findUnique.mockResolvedValue(evalDetail);
      prisma.tradeEvaluation.findFirst.mockResolvedValue(evalDetail);

      const result = await service.evaluatePick(mockPick.id);

      expect(result).toBeDefined();
      expect(result.id).toBe('eval-1');
      expect(prisma.tradeEvaluation.upsert).toHaveBeenCalled();
      expect(prisma.tradeEvaluationEvidence.upsert).toHaveBeenCalled();
      expect(prisma.pointsResult.upsert).toHaveBeenCalled();
    });
  });

  describe('evaluateTournamentDay', () => {
    it('should throw BadRequestException if no picks exist on that date', async () => {
      prisma.tournament.findUnique.mockResolvedValue({ id: 'tourney-1' });
      prisma.stockPick.findMany.mockResolvedValue([]);

      await expect(
        service.evaluateTournamentDay('tourney-1', '2026-09-05'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('overrideEvaluation', () => {
    it('should record override, update status to OVERRIDDEN, and create audit log', async () => {
      const mockExisting = {
        id: 'eval-1',
        entryPrice: 10000,
        exitPrice: 9700,
        realizedReturn: -3,
        pointsResult: { points: -3 },
        pick: mockPick,
      };

      prisma.tradeEvaluation.findUnique
        .mockResolvedValueOnce(mockExisting)
        .mockResolvedValueOnce({
          ...mockExisting,
          status: EvaluationStatus.OVERRIDDEN,
          exitPrice: 10200,
          realizedReturn: 2,
        });

      prisma.tradeEvaluation.findFirst
        .mockResolvedValueOnce(mockExisting)
        .mockResolvedValueOnce({
          ...mockExisting,
          status: EvaluationStatus.OVERRIDDEN,
          exitPrice: 10200,
          realizedReturn: 2,
        });

      prisma.evaluationOverride.upsert.mockResolvedValue({});
      prisma.tradeEvaluation.update.mockResolvedValue({});
      prisma.pointsResult.upsert.mockResolvedValue({});
      prisma.auditLog.create.mockResolvedValue({});

      const result = await service.overrideEvaluation(
        'eval-1',
        {
          overrideExitPrice: 10200,
          reason: 'Bursa membatalkan transaksi cut loss karena reject',
        },
        'admin-1',
      );

      expect(result).toBeDefined();
      expect(prisma.evaluationOverride.upsert).toHaveBeenCalled();
      expect(prisma.tradeEvaluation.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: EvaluationStatus.OVERRIDDEN,
          }),
        }),
      );
      expect(prisma.auditLog.create).toHaveBeenCalled();
    });
  });
});
