import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

jest.setTimeout(60000);

describe('Auth API (e2e)', () => {
  let app: INestApplication;
  let mockUser: any;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash('AdminSecurePass123!', 10);
    mockUser = {
      id: 'e2e-admin-uuid',
      email: 'admin@tradearena.local',
      name: 'TradeArena Super Admin',
      role: Role.ADMIN,
      passwordHash,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UsersService)
      .useValue({
        findByEmail: jest.fn().mockImplementation(async (email: string) => {
          if (email === mockUser.email) return mockUser;
          return null;
        }),
        findById: jest.fn().mockImplementation(async (id: string) => {
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
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  let accessToken = '';
  let refreshToken = '';

  it('POST /api/v1/auth/login with wrong credentials should return 401', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: 'admin@tradearena.local', password: 'WrongPassword!' })
      .expect(401);
  });

  it('POST /api/v1/auth/login with valid credentials should return 200 with tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({
        email: 'admin@tradearena.local',
        password: 'AdminSecurePass123!',
      })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
    expect(res.body.user.email).toBe('admin@tradearena.local');
    expect(res.body.user.role).toBe(Role.ADMIN);

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('GET /api/v1/auth/me without token should return 401', () => {
    return request(app.getHttpServer()).get('/api/v1/auth/me').expect(401);
  });

  it('GET /api/v1/auth/me with valid bearer token should return 200 and profile', () => {
    return request(app.getHttpServer())
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.email).toBe('admin@tradearena.local');
        expect(res.body.role).toBe(Role.ADMIN);
      });
  });

  it('GET /api/v1/auth/admin-test with valid admin bearer token should return 200', () => {
    return request(app.getHttpServer())
      .get('/api/v1/auth/admin-test')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.message).toBe('Admin access verified');
      });
  });

  it('POST /api/v1/auth/refresh with valid refresh token should return new tokens', async () => {
    const res = await request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken })
      .expect(200);

    expect(res.body).toHaveProperty('accessToken');
    expect(res.body).toHaveProperty('refreshToken');
  });

  it('POST /api/v1/auth/refresh with invalid token should return 401', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/refresh')
      .send({ refreshToken: 'invalid.token.here' })
      .expect(401);
  });

  it('POST /api/v1/auth/logout with valid token should return 200', () => {
    return request(app.getHttpServer())
      .post('/api/v1/auth/logout')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ refreshToken })
      .expect(200)
      .expect((res) => {
        expect(res.body.success).toBe(true);
      });
  });
});
