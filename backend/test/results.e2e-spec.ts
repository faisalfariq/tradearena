import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { ResultsService } from '../src/results/results.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.setTimeout(60000);

describe('Tournament Results & Points API (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  const mockAdmin = {
    id: '07d9a6da-01cc-400a-b432-f5f8c7d327fb',
    email: 'admin@tradearena.local',
    name: 'Super Admin',
    role: Role.ADMIN,
    passwordHash: '',
  };

  const mockTournamentId = 'tournament-bsjp-uuid';

  const mockDailyResponse = {
    tournamentId: mockTournamentId,
    tradingDate: '2026-09-05',
    metrics: {
      tradingDate: '2026-09-05',
      totalParticipants: 2,
      averageReturn: 3.5,
      gainersCount: 2,
      losersCount: 0,
      topGainer: {
        participantName: 'Alice',
        stockSymbol: 'BBCA',
        returnPct: 5.0,
        points: 5.0,
      },
      topLoser: null,
    },
    results: [
      {
        rank: 1,
        participantId: 'p1',
        participantName: 'Alice',
        stockSymbol: 'BBCA',
        stockName: 'Bank Central Asia',
        tradingDate: '2026-09-05',
        entryPrice: 10000,
        highestPrice: 10600,
        maxFloatingReturn: 6.0,
        exitPrice: 10500,
        exitTimestamp: new Date(),
        exitReason: 'TRAILING_STOP',
        realizedReturn: 5.0,
        points: 5.0,
        pointsRule: 'PERCENTAGE_RETURN_V1',
        evaluationStatus: 'COMPLETED',
        isOverridden: false,
      },
      {
        rank: 2,
        participantId: 'p2',
        participantName: 'Bob',
        stockSymbol: 'TLKM',
        stockName: 'Telkom Indonesia',
        tradingDate: '2026-09-05',
        entryPrice: 3000,
        highestPrice: 3080,
        maxFloatingReturn: 2.67,
        exitPrice: 3060,
        exitTimestamp: new Date(),
        exitReason: 'MARKET_CLOSE',
        realizedReturn: 2.0,
        points: 2.0,
        pointsRule: 'PERCENTAGE_RETURN_V1',
        evaluationStatus: 'COMPLETED',
        isOverridden: false,
      },
    ],
  };

  const mockOverallResponse = {
    tournamentId: mockTournamentId,
    tournamentName: 'BSJP Championship Musim 1',
    totalParticipants: 2,
    totalEvaluatedPicks: 4,
    standings: [
      {
        rank: 1,
        participantId: 'p1',
        participantName: 'Alice',
        totalPoints: 10.5,
        picksCount: 2,
        winCount: 2,
        lossCount: 0,
        breakevenCount: 0,
        winRate: 100,
        averageReturn: 5.25,
        bestPick: {
          symbol: 'BBCA',
          date: '2026-09-05',
          returnPct: 5.5,
          points: 5.5,
        },
        worstPick: {
          symbol: 'BBRI',
          date: '2026-09-06',
          returnPct: 5.0,
          points: 5.0,
        },
        dailyHistory: [],
      },
      {
        rank: 2,
        participantId: 'p2',
        participantName: 'Bob',
        totalPoints: 4.0,
        picksCount: 2,
        winCount: 1,
        lossCount: 1,
        breakevenCount: 0,
        winRate: 50,
        averageReturn: 2.0,
        bestPick: {
          symbol: 'TLKM',
          date: '2026-09-05',
          returnPct: 4.0,
          points: 4.0,
        },
        worstPick: {
          symbol: 'ASII',
          date: '2026-09-06',
          returnPct: 0.0,
          points: 0.0,
        },
        dailyHistory: [],
      },
    ],
  };

  const mockResultsService = {
    getDailyResults: jest.fn().mockResolvedValue(mockDailyResponse),
    getOverallResults: jest.fn().mockResolvedValue(mockOverallResponse),
    recalculateTournamentPoints: jest.fn().mockResolvedValue({
      message: 'Poin berhasil dihitung ulang',
      tournamentId: mockTournamentId,
      recalculatedCount: 4,
      pointsRule: 'PERCENTAGE_RETURN_V1',
    }),
  };

  beforeAll(async () => {
    mockAdmin.passwordHash = await bcrypt.hash('AdminPassword123!', 10);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UsersService)
      .useValue({
        findByEmail: jest.fn().mockImplementation(async (email: string) => {
          if (email === mockAdmin.email) return mockAdmin;
          return null;
        }),
        findById: jest.fn().mockImplementation(async (id: string) => {
          if (id === mockAdmin.id) return mockAdmin;
          return null;
        }),
      })
      .overrideProvider(ResultsService)
      .useValue(mockResultsService)
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await app.init();

    // Login to obtain Admin JWT token
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: mockAdmin.email,
        password: 'AdminPassword123!',
      });

    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/v1/tournaments/:tournamentId/results/daily', () => {
    it('should retrieve daily tournament results and rankings (Public / Auth)', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/tournaments/${mockTournamentId}/results/daily?tradingDate=2026-09-05`,
        )
        .expect(200);

      expect(res.body.tournamentId).toBe(mockTournamentId);
      expect(res.body.results).toHaveLength(2);
      expect(res.body.results[0].rank).toBe(1);
      expect(res.body.results[0].participantName).toBe('Alice');
      expect(res.body.metrics.averageReturn).toBe(3.5);
    });
  });

  describe('GET /api/v1/tournaments/:tournamentId/results/overall', () => {
    it('should retrieve overall tournament standings and statistics (Public / Auth)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tournaments/${mockTournamentId}/results/overall`)
        .expect(200);

      expect(res.body.tournamentId).toBe(mockTournamentId);
      expect(res.body.standings).toHaveLength(2);
      expect(res.body.standings[0].rank).toBe(1);
      expect(res.body.standings[0].totalPoints).toBe(10.5);
      expect(res.body.standings[0].winRate).toBe(100);
    });
  });

  describe('POST /api/v1/tournaments/:tournamentId/results/recalculate', () => {
    it('should reject unauthenticated requests with 401', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tournaments/${mockTournamentId}/results/recalculate`)
        .expect(401);
    });

    it('should allow Admin to recalculate tournament points with 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tournaments/${mockTournamentId}/results/recalculate`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body.recalculatedCount).toBe(4);
      expect(
        mockResultsService.recalculateTournamentPoints,
      ).toHaveBeenCalledWith(mockTournamentId);
    });
  });
});
