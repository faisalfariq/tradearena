import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { MarketDataService } from '../src/market-data/market-data.service';
import { Role, SyncStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.setTimeout(60000);

describe('Market Data & Sync API (e2e)', () => {
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

  const mockSyncRun = {
    id: 'sync-run-123',
    tournamentId: mockTournamentId,
    tradingDate: new Date('2026-10-15T00:00:00.000Z'),
    status: SyncStatus.SUCCESS,
    totalSymbols: 2,
    syncedCount: 2,
    failedCount: 0,
    items: [
      {
        id: 'item-1',
        syncRunId: 'sync-run-123',
        symbol: 'BBCA',
        status: SyncStatus.SUCCESS,
        candlesCount: 330,
      },
      {
        id: 'item-2',
        syncRunId: 'sync-run-123',
        symbol: 'BBRI',
        status: SyncStatus.SUCCESS,
        candlesCount: 330,
      },
    ],
  };

  const mockCandles = [
    {
      id: 'candle-1',
      stockId: 'stock-1',
      symbol: 'BBCA',
      tradingDate: new Date('2026-10-15T00:00:00.000Z'),
      timestamp: new Date('2026-10-15T02:00:00.000Z'),
      open: 10000,
      high: 10050,
      low: 9950,
      close: 10020,
      volume: '5000',
      provider: 'mock',
    },
  ];

  beforeAll(async () => {
    mockAdmin.passwordHash = await bcrypt.hash('AdminSecurePass123!', 10);

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
      .overrideProvider(MarketDataService)
      .useValue({
        triggerSync: jest.fn().mockResolvedValue(mockSyncRun),
        getSyncRuns: jest.fn().mockResolvedValue([mockSyncRun]),
        getSyncRunDetail: jest.fn().mockResolvedValue(mockSyncRun),
        getCandles: jest.fn().mockResolvedValue(mockCandles),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    await app.init();

    // Login as Admin to obtain JWT
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

  describe('POST /api/v1/tournaments/:id/market-sync', () => {
    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tournaments/${mockTournamentId}/market-sync`)
        .send({
          tradingDate: '2026-10-15',
        })
        .expect(401);
    });

    it('should allow admin to trigger market data sync with 201 Created', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tournaments/${mockTournamentId}/market-sync`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          tradingDate: '2026-10-15',
        })
        .expect(201);

      expect(res.body.id).toBe(mockSyncRun.id);
      expect(res.body.status).toBe(SyncStatus.SUCCESS);
      expect(res.body.totalSymbols).toBe(2);
    });
  });

  describe('GET /api/v1/tournaments/:id/market-sync', () => {
    it('should return list of sync runs with 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tournaments/${mockTournamentId}/market-sync`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].id).toBe(mockSyncRun.id);
    });
  });

  describe('GET /api/v1/tournaments/:id/market-sync/:runId', () => {
    it('should return sync run detail with 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .get(
          `/api/v1/tournaments/${mockTournamentId}/market-sync/${mockSyncRun.id}`,
        )
        .expect(200);

      expect(res.body.id).toBe(mockSyncRun.id);
      expect(res.body.items).toHaveLength(2);
    });
  });

  describe('GET /api/v1/market-data/candles', () => {
    it('should return stored intraday candles with 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/market-data/candles?symbol=BBCA&tradingDate=2026-10-15')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].symbol).toBe('BBCA');
      expect(res.body[0].open).toBe(10000);
    });
  });
});
