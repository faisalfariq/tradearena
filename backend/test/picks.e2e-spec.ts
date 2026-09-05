import { Test, TestingModule } from '@nestjs/testing';
import {
  INestApplication,
  ValidationPipe,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { StocksService } from '../src/stocks/stocks.service';
import { ParticipantsService } from '../src/participants/participants.service';
import { PicksService } from '../src/picks/picks.service';
import { TournamentsService } from '../src/tournaments/tournaments.service';
import { Role, EntrySource, PickStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.setTimeout(60000);

describe('Participants, Stocks & Picks API (e2e)', () => {
  let app: INestApplication;
  let adminToken: string;

  const mockAdmin = {
    id: '07d9a6da-01cc-400a-b432-f5f8c7d327fb',
    email: 'admin@tradearena.local',
    name: 'Super Admin',
    role: Role.ADMIN,
    passwordHash: '',
  };

  const duplicateStockId = 'b2222222-2222-4222-a222-222222222222';

  const mockStock = {
    id: 'stock-bbca-uuid',
    symbol: 'BBCA',
    name: 'Bank Central Asia Tbk',
    exchange: 'IDX',
    isActive: true,
  };

  const mockParticipant = {
    id: 'participant-budi-uuid',
    name: 'Budi Santoso',
    email: 'budi@bsjp.local',
    phoneNumber: '081234567890',
  };

  const mockTournament = {
    id: 'tournament-bsjp-uuid',
    name: 'BSJP Season 1',
    startDate: new Date('2026-10-01T00:00:00.000Z'),
    endDate: new Date('2026-10-31T23:59:59.000Z'),
  };

  const mockPick = {
    id: 'pick-1-uuid',
    tournamentId: mockTournament.id,
    participantId: mockParticipant.id,
    stockId: mockStock.id,
    tradingDate: new Date('2026-10-15T00:00:00.000Z'),
    entryPrice: 9200,
    entrySource: EntrySource.MARKET_OPEN,
    status: PickStatus.CONFIRMED,
    participant: mockParticipant,
    stock: mockStock,
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
      .overrideProvider(StocksService)
      .useValue({
        findAll: jest.fn().mockResolvedValue([mockStock]),
        findOne: jest.fn().mockResolvedValue(mockStock),
        create: jest.fn().mockResolvedValue(mockStock),
      })
      .overrideProvider(ParticipantsService)
      .useValue({
        findAll: jest.fn().mockResolvedValue([mockParticipant]),
        findOne: jest.fn().mockResolvedValue(mockParticipant),
        create: jest.fn().mockResolvedValue(mockParticipant),
        getTournamentParticipants: jest.fn().mockResolvedValue([
          {
            membershipId: 'mem-1',
            tournamentId: mockTournament.id,
            participant: mockParticipant,
            picksCount: 1,
          },
        ]),
        enroll: jest.fn().mockResolvedValue({
          id: 'mem-1',
          tournamentId: mockTournament.id,
          participantId: mockParticipant.id,
          participant: mockParticipant,
        }),
      })
      .overrideProvider(PicksService)
      .useValue({
        findAll: jest.fn().mockResolvedValue([mockPick]),
        findOne: jest.fn().mockResolvedValue(mockPick),
        create: jest.fn().mockImplementation(async (tourneyId, dto) => {
          if (dto.tradingDate === '2026-11-05') {
            throw new BadRequestException('Date out of bounds');
          }
          if (dto.stockId === duplicateStockId) {
            throw new ConflictException('Duplicate pick');
          }
          return {
            id: 'pick-new-uuid',
            tournamentId: tourneyId,
            ...dto,
            participant: mockParticipant,
            stock: mockStock,
          };
        }),
      })
      .overrideProvider(TournamentsService)
      .useValue({
        findOne: jest.fn().mockResolvedValue(mockTournament),
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

    // Login as Admin to get Bearer token
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

  describe('GET /api/v1/stocks', () => {
    it('should return list of stocks with 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/stocks')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].symbol).toBe('BBCA');
    });
  });

  describe('GET /api/v1/participants', () => {
    it('should return list of participants with 200 OK', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/participants')
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].name).toBe('Budi Santoso');
    });
  });

  describe('GET /api/v1/tournaments/:id/participants', () => {
    it('should return enrolled tournament participants', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tournaments/${mockTournament.id}/participants`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].participant.name).toBe('Budi Santoso');
    });
  });

  describe('POST /api/v1/tournaments/:id/picks', () => {
    it('should reject unauthenticated request with 401 Unauthorized', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tournaments/${mockTournament.id}/picks`)
        .send({
          participantId: 'a1111111-1111-4111-a111-111111111111',
          stockId: 'b2222222-2222-4222-b222-222222222222',
          tradingDate: '2026-10-15',
          entryPrice: 9200,
        })
        .expect(401);
    });

    it('should allow admin to create a valid stock pick', async () => {
      const res = await request(app.getHttpServer())
        .post(`/api/v1/tournaments/${mockTournament.id}/picks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          participantId: 'a1111111-1111-4111-a111-111111111111',
          stockId: 'b2222222-2222-4222-b222-222222222222',
          tradingDate: '2026-10-15',
          entryPrice: 9200,
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.entryPrice).toBe(9200);
    });

    it('should reject duplicate pick with 409 Conflict', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/tournaments/${mockTournament.id}/picks`)
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          participantId: 'a1111111-1111-4111-a111-111111111111',
          stockId: duplicateStockId,
          tradingDate: '2026-10-15',
          entryPrice: 9200,
        })
        .expect(409);
    });
  });

  describe('GET /api/v1/tournaments/:id/picks', () => {
    it('should return picks for tournament', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/v1/tournaments/${mockTournament.id}/picks`)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body[0].entryPrice).toBe(9200);
    });
  });
});
