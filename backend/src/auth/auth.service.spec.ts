import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UnauthorizedException } from '@nestjs/common';
import { Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: Partial<UsersService>;
  let jwtService: Partial<JwtService>;
  let prismaService: Partial<PrismaService>;

  const mockUser = {
    id: 'user-uuid-123',
    email: 'admin@tradearena.local',
    name: 'Admin Test',
    role: Role.ADMIN,
    passwordHash: '',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeAll(async () => {
    mockUser.passwordHash = await bcrypt.hash('secret123', 10);
  });

  beforeEach(async () => {
    usersService = {
      findByEmail: jest.fn().mockImplementation(async (email: string) => {
        if (email === mockUser.email) return mockUser;
        return null;
      }),
      findById: jest.fn().mockImplementation(async (id: string) => {
        if (id === mockUser.id) return mockUser;
        return null;
      }),
    };

    jwtService = {
      sign: jest.fn().mockReturnValue('mock-jwt-token'),
      verify: jest.fn().mockImplementation((token: string) => {
        if (token === 'valid-refresh-token') {
          return {
            sub: mockUser.id,
            email: mockUser.email,
            role: mockUser.role,
          };
        }
        throw new Error('Invalid token');
      }),
    };

    prismaService = {
      refreshToken: {
        create: jest.fn().mockResolvedValue({ id: '1', token: 'token' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: UsersService, useValue: usersService },
        { provide: JwtService, useValue: jwtService },
        { provide: ConfigService, useValue: { get: (key: string) => key } },
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('validateUser', () => {
    it('should return user when credentials are valid', async () => {
      const result = await service.validateUser(
        'admin@tradearena.local',
        'secret123',
      );
      expect(result).toBeDefined();
      expect(result.email).toBe('admin@tradearena.local');
    });

    it('should throw UnauthorizedException when user not found', async () => {
      await expect(
        service.validateUser('unknown@tradearena.local', 'secret123'),
      ).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException when password does not match', async () => {
      await expect(
        service.validateUser('admin@tradearena.local', 'wrongpass'),
      ).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('login', () => {
    it('should return access token, refresh token and user info', async () => {
      const result = await service.login({
        email: 'admin@tradearena.local',
        password: 'secret123',
      });

      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.email).toBe('admin@tradearena.local');
      expect(result.user.role).toBe(Role.ADMIN);
    });
  });

  describe('refresh', () => {
    it('should issue new tokens when refresh token is valid', async () => {
      const result = await service.refresh('valid-refresh-token');
      expect(result).toHaveProperty('accessToken');
      expect(result).toHaveProperty('refreshToken');
      expect(result.user.id).toBe(mockUser.id);
    });

    it('should throw UnauthorizedException when refresh token is invalid', async () => {
      await expect(service.refresh('invalid-token')).rejects.toThrow(
        UnauthorizedException,
      );
    });
  });

  describe('logout', () => {
    it('should return success true', async () => {
      const result = await service.logout(mockUser.id, 'some-token');
      expect(result.success).toBe(true);
    });
  });
});
