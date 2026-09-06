import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { EvaluationService } from '../src/evaluation/evaluation.service';
import { Role, ExitReason, EvaluationStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.setTimeout(60000);

describe('Trade Evaluation Engine API (e2e)', () => {
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

  const mockEvaluation = {
    id: 'eval-uuid-1',
    pickId: 'pick-uuid-1',
    status: EvaluationStatus.COMPLETED,
    entryPrice: 10000,
    exitPrice: 10500,
    exitTimestamp: new Date('2026-09-05T06:00:00.000Z'),
    exitReason: ExitReason.TRAILING_STOP,
    highestPrice: 10900,
    maxFloatingReturn: 9.0,
    theoreticalThreshold: 105.73,
    actualExitPrice: 10500,
    realizedReturn: 5.0,
    calculationVersion: 'v1.0.0',
    evidence: {
      id: 'evidence-1',
      evaluationId: 'eval-uuid-1',
      marketDataProvider: 'canonical',
      marketDataDate: new Date('2026-09-05'),
      candleCount: 330,
      priceFractionVersion: 'IDX_STANDARD_V1',
      detailsJson: {},
    },
    pick: {
      id: 'pick-uuid-1',
      stock: { symbol: 'BBCA', name: 'Bank Central Asia' },
      participant: { name: 'Budi Santoso' },
    },
  };

  const mockEvaluationService = {
    evaluateTournamentDay: jest.fn().mockResolvedValue({
      tournamentId: mockTournamentId,
      tradingDate: '2026-09-05',
      totalPicks: 1,
      evaluatedCount: 1,
      evaluations: [mockEvaluation],
    }),
    evaluatePick: jest.fn().mockResolvedValue(mockEvaluation),
    getTournamentEvaluations: jest.fn().mockResolvedValue([mockEvaluation]),
    getEvaluationDetail: jest.fn().mockResolvedValue(mockEvaluation),
    overrideEvaluation: jest.fn().mockResolvedValue({
      ...mockEvaluation,
      status: EvaluationStatus.OVERRIDDEN,
      exitPrice: 10300,
      realizedReturn: 3.0,
    }),
  };

  beforeAll(async () => {
    mockAdmin.passwordHash = await bcrypt.hash('AdminSecurePass123!', 10);

    const mockUsersService = {
      findByEmail: jest.fn().mockImplementation((email: string) => {
        if (email === mockAdmin.email) return Promise.resolve(mockAdmin);
        return Promise.resolve(null);
      }),
      findById: jest.fn().mockImplementation((id: string) => {
        if (id === mockAdmin.id) return Promise.resolve(mockAdmin);
        return Promise.resolve(null);
      }),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UsersService)
      .useValue(mockUsersService)
      .overrideProvider(EvaluationService)
      .useValue(mockEvaluationService)
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

    // Login as Admin
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@tradearena.local',
        password: 'AdminSecurePass123!',
      });

    adminToken = loginRes.body.accessToken;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/tournaments/:id/evaluations/run', () => {
    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tournaments/${mockTournamentId}/evaluations/run`)
        .send({ tradingDate: '2026-09-05' })
        .expect(401);
    });

    it('should run batch evaluation for tournament on trading date when authenticated as Admin', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tournaments/${mockTournamentId}/evaluations/run`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tradingDate: '2026-09-05' })
        .expect(200);

      expect(res.body.tournamentId).toBe(mockTournamentId);
      expect(res.body.evaluatedCount).toBe(1);
      expect(mockEvaluationService.evaluateTournamentDay).toHaveBeenCalledWith(
        mockTournamentId,
        '2026-09-05',
      );
    });
  });

  describe('GET /api/v1/tournaments/:id/evaluations', () => {
    it('should return list of evaluations for tournament', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/tournaments/${mockTournamentId}/evaluations?tradingDate=2026-09-05`,
        )
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].exitReason).toBe(ExitReason.TRAILING_STOP);
      expect(res.body[0].realizedReturn).toBe(5.0);
    });
  });

  describe('GET /api/v1/evaluations/:id', () => {
    it('should return detailed evaluation with evidence and trigger candle', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/evaluations/eval-uuid-1')
        .expect(200);

      expect(res.body.id).toBe('eval-uuid-1');
      expect(res.body.evidence).toBeDefined();
      expect(res.body.evidence.priceFractionVersion).toBe('IDX_STANDARD_V1');
    });
  });

  describe('POST /api/v1/evaluations/:id/override', () => {
    it('should allow Admin to record manual override with reason', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/evaluations/eval-uuid-1/override')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          overrideExitPrice: 10300,
          reason: 'Koreksi manual pembatalan transaksi bursa',
        })
        .expect(200);

      expect(res.body.status).toBe(EvaluationStatus.OVERRIDDEN);
      expect(res.body.exitPrice).toBe(10300);
      expect(mockEvaluationService.overrideEvaluation).toHaveBeenCalled();
    });
  });
});
