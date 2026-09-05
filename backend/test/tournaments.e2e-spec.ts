import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { TournamentsService } from '../src/tournaments/tournaments.service';
import {
  Role,
  TournamentStatus,
  CandleAmbiguityPolicy,
  GapPolicy,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.setTimeout(60000);

describe('Tournaments API (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  const mockAdmin = {
    id: 'admin-uuid',
    email: 'admin@tradearena.local',
    name: 'Super Admin',
    role: Role.ADMIN,
    passwordHash: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTournament = {
    id: 'tourney-123',
    name: 'BSJP Daily Season 1',
    description: 'Turnamen komunitas',
    startDate: new Date('2026-10-01T00:00:00.000Z'),
    endDate: new Date('2026-10-31T23:59:59.000Z'),
    timezone: 'Asia/Jakarta',
    status: TournamentStatus.UPCOMING,
    createdAt: new Date(),
    updatedAt: new Date(),
    rules: {
      id: 'rule-123',
      tournamentId: 'tourney-123',
      initialStopPct: 0.03,
      trailingStopPct: 0.03,
      candleAmbiguityPolicy: CandleAmbiguityPolicy.CONSERVATIVE_LOSS_FIRST,
      gapPolicy: GapPolicy.ACTUAL_FIRST_VALID_LEVEL,
      priceFractionPolicy: 'IDX_STANDARD_V1',
      pointsRule: 'PERCENTAGE_RETURN_V1',
      calculationRuleVersion: 'v1.0.0',
    },
  };

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
      .overrideProvider(TournamentsService)
      .useValue({
        findAll: jest.fn().mockResolvedValue([mockTournament]),
        findOne: jest.fn().mockImplementation(async (id: string) => {
          if (id === mockTournament.id) return mockTournament;
          return null;
        }),
        create: jest.fn().mockResolvedValue(mockTournament),
        update: jest.fn().mockResolvedValue(mockTournament),
        updateStatus: jest.fn().mockResolvedValue({
          ...mockTournament,
          status: TournamentStatus.ACTIVE,
        }),
        remove: jest.fn().mockResolvedValue(mockTournament),
      })
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

    // Authenticate admin to get token
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

  it('GET /api/v1/tournaments should return list of tournaments', async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/tournaments')
      .expect(200);

    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body.length).toBeGreaterThan(0);
    expect(res.body[0].name).toBe('BSJP Daily Season 1');
  });

  it('GET /api/v1/tournaments/:id should return tournament details and rules', async () => {
    const res = await request(app.getHttpServer())
      .get(`/api/v1/tournaments/${mockTournament.id}`)
      .expect(200);

    expect(res.body.id).toBe(mockTournament.id);
    expect(res.body.rules).toBeDefined();
    expect(res.body.rules.initialStopPct).toBe(0.03);
    expect(res.body.rules.trailingStopPct).toBe(0.03);
  });

  it('POST /api/v1/tournaments without token should return 401', () => {
    return request(app.getHttpServer())
      .post('/api/v1/tournaments')
      .send({
        name: 'Unauthenticated Tournament',
        startDate: '2026-10-01T00:00:00.000Z',
        endDate: '2026-10-31T23:59:59.000Z',
      })
      .expect(401);
  });

  it('POST /api/v1/tournaments with valid admin token should return 201', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/tournaments')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'BSJP Daily Season 1',
        description: 'Turnamen komunitas',
        startDate: '2026-10-01T00:00:00.000Z',
        endDate: '2026-10-31T23:59:59.000Z',
        rules: {
          initialStopPct: 0.03,
          trailingStopPct: 0.03,
          candleAmbiguityPolicy: 'CONSERVATIVE_LOSS_FIRST',
          gapPolicy: 'ACTUAL_FIRST_VALID_LEVEL',
        },
      })
      .expect(201);

    expect(res.body).toHaveProperty('id');
    expect(res.body.name).toBe('BSJP Daily Season 1');
  });

  it('PATCH /api/v1/tournaments/:id/status should update tournament status', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/api/v1/tournaments/${mockTournament.id}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'ACTIVE' })
      .expect(200);

    expect(res.body.status).toBe('ACTIVE');
  });
});
