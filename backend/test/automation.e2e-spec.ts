import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { AutomationService } from '../src/automation/automation.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.setTimeout(60000);

describe('Automation & Exception Handling API (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;
  let userToken: string;

  const mockAdmin = {
    id: 'admin-uuid-automation-test',
    email: 'admin-auto@tradearena.local',
    name: 'Admin Automation',
    role: Role.ADMIN,
    passwordHash: '',
  };

  const mockUser = {
    id: 'user-uuid-automation-test',
    email: 'user-auto@tradearena.local',
    name: 'Regular User',
    role: Role.PARTICIPANT,
    passwordHash: '',
  };

  const mockTournamentId = 'tournament-automation-uuid';
  const mockDate = '2026-09-05';

  const mockPipelineReport = {
    pipelineId: 'pipeline-1234567890',
    tournamentId: mockTournamentId,
    tournamentName: 'Test Tournament',
    tradingDate: mockDate,
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    overallStatus: 'SUCCESS',
    uniqueSymbolsCount: 3,
    picksCount: 3,
    evaluatedCount: 3,
    completedCount: 3,
    exceptionsCount: 0,
    recalculatedPointsCount: 3,
    steps: [
      {
        step: 'COLLECT_PICKS',
        status: 'SUCCESS',
        message: 'Ditemukan 3 stock pick',
      },
      {
        step: 'MARKET_DATA_SYNC',
        status: 'SUCCESS',
        message: 'Sinkronisasi selesai',
      },
      {
        step: 'DETERMINISTIC_EVALUATION',
        status: 'SUCCESS',
        message: 'Evaluasi trade selesai',
      },
      {
        step: 'POINTS_CALCULATION',
        status: 'SUCCESS',
        message: 'Kalkulasi poin berhasil',
      },
    ],
  };

  const mockExceptionsResponse = {
    tournamentId: mockTournamentId,
    totalExceptions: 1,
    reviewRequiredCount: 1,
    pendingDataCount: 0,
    exceptions: [
      {
        evaluationId: 'eval-ex-1',
        pickId: 'pick-ex-1',
        stockSymbol: 'BBCA',
        stockName: 'Bank Central Asia',
        participantName: 'Alice',
        tradingDate: mockDate,
        entryPrice: 10250,
        status: 'REVIEW_REQUIRED',
        reviewReason: 'Candle ambiguity requires human review',
        missingCandlesCount: 0,
      },
    ],
  };

  const mockAutomationService = {
    runDailyPipeline: jest.fn().mockResolvedValue(mockPipelineReport),
    getExceptions: jest.fn().mockResolvedValue(mockExceptionsResponse),
    retryEvaluation: jest.fn().mockResolvedValue({
      message: 'Evaluasi untuk BBCA berhasil dicoba ulang.',
      previousStatus: 'REVIEW_REQUIRED',
      newStatus: 'COMPLETED',
      result: { id: 'eval-ex-1', status: 'COMPLETED', realizedReturn: 2.5 },
    }),
  };

  const mockPrismaService = {
    auditLog: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'audit-log-1',
          userId: mockAdmin.id,
          action: 'DAILY_POST_MARKET_PIPELINE',
          entityType: 'Tournament',
          entityId: mockTournamentId,
          newValues: { overallStatus: 'SUCCESS' },
          createdAt: new Date(),
        },
      ]),
    },
  };

  beforeAll(async () => {
    mockAdmin.passwordHash = await bcrypt.hash('AdminSecret123!', 10);
    mockUser.passwordHash = await bcrypt.hash('UserSecret123!', 10);

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AutomationService)
      .useValue(mockAutomationService)
      .overrideProvider(PrismaService)
      .useValue(mockPrismaService)
      .overrideProvider(UsersService)
      .useValue({
        findByEmail: jest.fn().mockImplementation(async (email: string) => {
          if (email === mockAdmin.email) return mockAdmin;
          if (email === mockUser.email) return mockUser;
          return null;
        }),
        findById: jest.fn().mockImplementation(async (id: string) => {
          if (id === mockAdmin.id) return mockAdmin;
          if (id === mockUser.id) return mockUser;
          return null;
        }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );
    await app.init();

    // Login Admin
    const adminLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: mockAdmin.email, password: 'AdminSecret123!' });
    adminToken = adminLoginRes.body.accessToken;

    // Login User
    const userLoginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: mockUser.email, password: 'UserSecret123!' });
    userToken = userLoginRes.body.accessToken;
  });

  afterAll(async () => {
    if (app) await app.close();
  });

  describe('POST /api/v1/tournaments/:id/pipeline/run', () => {
    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tournaments/${mockTournamentId}/pipeline/run`)
        .expect(401);
    });

    it('should reject non-admin request with 403', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tournaments/${mockTournamentId}/pipeline/run`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should run daily pipeline successfully for admin', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tournaments/${mockTournamentId}/pipeline/run`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ tradingDate: mockDate })
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.overallStatus).toBe('SUCCESS');
      expect(res.body.steps).toHaveLength(4);
      expect(mockAutomationService.runDailyPipeline).toHaveBeenCalledWith(
        mockTournamentId,
        mockDate,
        mockAdmin.id,
      );
    });
  });

  describe('GET /api/v1/tournaments/:id/exceptions', () => {
    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/tournaments/${mockTournamentId}/exceptions`)
        .expect(401);
    });

    it('should reject non-admin request with 403', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/tournaments/${mockTournamentId}/exceptions`)
        .set('Authorization', `Bearer ${userToken}`)
        .expect(403);
    });

    it('should return exceptions summary and list for admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tournaments/${mockTournamentId}/exceptions`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.totalExceptions).toBe(1);
      expect(res.body.exceptions).toHaveLength(1);
      expect(res.body.exceptions[0].stockSymbol).toBe('BBCA');
    });
  });

  describe('POST /api/v1/evaluations/:id/retry', () => {
    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/evaluations/eval-ex-1/retry')
        .expect(401);
    });

    it('should retry evaluation successfully for admin', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/evaluations/eval-ex-1/retry')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(res.body).toBeDefined();
      expect(res.body.newStatus).toBe('COMPLETED');
      expect(mockAutomationService.retryEvaluation).toHaveBeenCalledWith(
        'eval-ex-1',
        mockAdmin.id,
      );
    });
  });

  describe('GET /api/v1/tournaments/:id/audit-trail', () => {
    it('should reject unauthenticated request with 401', async () => {
      await request(app.getHttpServer())
        .get(`/api/v1/tournaments/${mockTournamentId}/audit-trail`)
        .expect(401);
    });

    it('should fetch operational audit trail for admin', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tournaments/${mockTournamentId}/audit-trail`)
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].action).toBe('DAILY_POST_MARKET_PIPELINE');
    });
  });
});
