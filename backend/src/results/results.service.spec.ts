import { Test, TestingModule } from '@nestjs/testing';
import { ResultsService } from './results.service';
import { PointsEngine } from './engines/points.engine';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException } from '@nestjs/common';
import { EvaluationStatus } from '@prisma/client';

describe('ResultsService', () => {
  let service: ResultsService;
  let prisma: any;

  const mockTournament = {
    id: 'tourney-1',
    name: 'Turnamen IDX Championship',
    rules: {
      id: 'rule-1',
      pointsRule: 'PERCENTAGE_RETURN_V1',
      calculationRuleVersion: 'v1.0.0',
    },
    participants: [
      {
        participantId: 'part-1',
        participant: { id: 'part-1', name: 'Alice', email: 'alice@test.id' },
      },
      {
        participantId: 'part-2',
        participant: { id: 'part-2', name: 'Bob', email: 'bob@test.id' },
      },
    ],
  };

  beforeEach(async () => {
    prisma = {
      tournament: {
        findUnique: jest.fn(),
      },
      tradeEvaluation: {
        findMany: jest.fn(),
      },
      pointsResult: {
        upsert: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultsService,
        PointsEngine,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<ResultsService>(ResultsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getDailyResults', () => {
    it('should throw NotFoundException if tournament does not exist', async () => {
      prisma.tournament.findUnique.mockResolvedValue(null);

      await expect(
        service.getDailyResults('invalid-id', '2026-09-05'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should correctly sort and rank participants with deterministic tie-breaking', async () => {
      prisma.tournament.findUnique.mockResolvedValue(mockTournament);

      // Alice & Bob have identical realizedReturn (+2.0%), but Bob had higher maxFloatingReturn (+5.0% vs +3.0%)
      const mockEvals = [
        {
          id: 'eval-alice',
          pickId: 'pick-alice',
          realizedReturn: 2.0,
          maxFloatingReturn: 3.0,
          exitTimestamp: new Date('2026-09-05T15:00:00.000Z'),
          exitReason: 'TRAILING_STOP',
          status: EvaluationStatus.COMPLETED,
          entryPrice: 1000,
          highestPrice: 1030,
          exitPrice: 1020,
          pick: {
            participantId: 'part-1',
            participant: { name: 'Alice', email: 'alice@test.id' },
            stock: { symbol: 'BBCA', name: 'Bank Central Asia' },
            tradingDate: new Date('2026-09-05T00:00:00.000Z'),
          },
          pointsResult: { points: 2.0, pointsRule: 'PERCENTAGE_RETURN_V1' },
          override: null,
        },
        {
          id: 'eval-bob',
          pickId: 'pick-bob',
          realizedReturn: 2.0,
          maxFloatingReturn: 5.0, // Higher peak! Should rank #1 via tie-breaker
          exitTimestamp: new Date('2026-09-05T15:00:00.000Z'),
          exitReason: 'TRAILING_STOP',
          status: EvaluationStatus.COMPLETED,
          entryPrice: 5000,
          highestPrice: 5250,
          exitPrice: 5100,
          pick: {
            participantId: 'part-2',
            participant: { name: 'Bob', email: 'bob@test.id' },
            stock: { symbol: 'TLKM', name: 'Telkom Indonesia' },
            tradingDate: new Date('2026-09-05T00:00:00.000Z'),
          },
          pointsResult: { points: 2.0, pointsRule: 'PERCENTAGE_RETURN_V1' },
          override: null,
        },
      ];

      prisma.tradeEvaluation.findMany.mockResolvedValue(mockEvals);

      const response = await service.getDailyResults('tourney-1', '2026-09-05');

      expect(response.tournamentId).toBe('tourney-1');
      expect(response.results).toHaveLength(2);

      // Bob should be Rank 1 because maxFloatingReturn (5.0) > Alice (3.0)
      expect(response.results[0].participantName).toBe('Bob');
      expect(response.results[0].rank).toBe(1);

      // Alice should be Rank 2
      expect(response.results[1].participantName).toBe('Alice');
      expect(response.results[1].rank).toBe(2);

      // Metrics
      expect(response.metrics.averageReturn).toBe(2.0);
      expect(response.metrics.gainersCount).toBe(2);
      expect(response.metrics.losersCount).toBe(0);
      expect(response.metrics.topGainer?.participantName).toBe('Bob');
    });
  });

  describe('getOverallResults', () => {
    it('should aggregate multi-day points and compute overall standings with tie-breaker', async () => {
      prisma.tournament.findUnique.mockResolvedValue(mockTournament);

      // Alice: 2 picks (+3.0%, +1.0% = Total 4.0 points, 2 wins)
      // Bob: 2 picks (+4.0%, 0.0% = Total 4.0 points, 1 win)
      // Since totalPoints is equal (4.0), Alice should win tie-breaker because winCount (2) > Bob (1)!
      const mockEvals = [
        {
          id: 'e1',
          status: EvaluationStatus.COMPLETED,
          realizedReturn: 3.0,
          pointsResult: { points: 3.0 },
          pick: {
            participantId: 'part-1',
            participant: { name: 'Alice' },
            stock: { symbol: 'BBCA' },
            tradingDate: new Date('2026-09-01T00:00:00.000Z'),
          },
        },
        {
          id: 'e2',
          status: EvaluationStatus.COMPLETED,
          realizedReturn: 1.0,
          pointsResult: { points: 1.0 },
          pick: {
            participantId: 'part-1',
            participant: { name: 'Alice' },
            stock: { symbol: 'BBRI' },
            tradingDate: new Date('2026-09-02T00:00:00.000Z'),
          },
        },
        {
          id: 'e3',
          status: EvaluationStatus.COMPLETED,
          realizedReturn: 4.0,
          pointsResult: { points: 4.0 },
          pick: {
            participantId: 'part-2',
            participant: { name: 'Bob' },
            stock: { symbol: 'TLKM' },
            tradingDate: new Date('2026-09-01T00:00:00.000Z'),
          },
        },
        {
          id: 'e4',
          status: EvaluationStatus.COMPLETED,
          realizedReturn: 0.0,
          pointsResult: { points: 0.0 },
          pick: {
            participantId: 'part-2',
            participant: { name: 'Bob' },
            stock: { symbol: 'BMRI' },
            tradingDate: new Date('2026-09-02T00:00:00.000Z'),
          },
        },
      ];

      prisma.tradeEvaluation.findMany.mockResolvedValue(mockEvals);

      const response = await service.getOverallResults('tourney-1');

      expect(response.standings).toHaveLength(2);

      // Alice: Rank 1 (equal 4.0 points, but 2 wins vs 1 win)
      expect(response.standings[0].participantName).toBe('Alice');
      expect(response.standings[0].rank).toBe(1);
      expect(response.standings[0].totalPoints).toBe(4.0);
      expect(response.standings[0].winCount).toBe(2);
      expect(response.standings[0].winRate).toBe(100);

      // Bob: Rank 2
      expect(response.standings[1].participantName).toBe('Bob');
      expect(response.standings[1].rank).toBe(2);
      expect(response.standings[1].totalPoints).toBe(4.0);
      expect(response.standings[1].winCount).toBe(1);
      expect(response.standings[1].winRate).toBe(50);
    });
  });

  describe('recalculateTournamentPoints', () => {
    it('should recalculate points for all completed evaluations in the tournament', async () => {
      prisma.tournament.findUnique.mockResolvedValue(mockTournament);

      const mockEvals = [
        {
          id: 'eval-1',
          realizedReturn: 5.2,
          exitReason: 'MARKET_CLOSE',
          override: null,
        },
        {
          id: 'eval-2',
          realizedReturn: -3.0,
          exitReason: 'INITIAL_CL',
          override: null,
        },
      ];

      prisma.tradeEvaluation.findMany.mockResolvedValue(mockEvals);
      prisma.pointsResult.upsert.mockResolvedValue({ id: 'pts-1' });

      const result = await service.recalculateTournamentPoints('tourney-1');

      expect(result.recalculatedCount).toBe(2);
      expect(prisma.pointsResult.upsert).toHaveBeenCalledTimes(2);
    });
  });
});
