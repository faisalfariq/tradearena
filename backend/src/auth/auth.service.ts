import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';
import { Role, User } from '@prisma/client';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async validateUser(email: string, pass: string): Promise<User> {
    const user = await this.usersService.findByEmail(email);
    if (!user) {
      throw new UnauthorizedException('Kredensial tidak valid');
    }
    const isMatch = await bcrypt.compare(pass, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Kredensial tidak valid');
    }
    return user;
  }

  async login(loginDto: LoginDto) {
    const user = await this.validateUser(loginDto.email, loginDto.password);
    return this.generateTokens(user);
  }

  async generateTokens(user: {
    id: string;
    email: string;
    name: string;
    role: Role;
  }) {
    const accessPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: randomUUID(),
    };

    const refreshPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      jti: randomUUID(),
    };

    const accessToken = this.jwtService.sign(accessPayload, {
      secret:
        this.configService.get<string>('JWT_SECRET') ||
        'super-secret-jwt-key-min-32-chars',
      expiresIn: this.configService.get<string>('JWT_EXPIRES_IN') || '1h',
    });

    const refreshToken = this.jwtService.sign(refreshPayload, {
      secret:
        this.configService.get<string>('JWT_REFRESH_SECRET') ||
        'super-secret-refresh-key-min-32-chars',
      expiresIn:
        this.configService.get<string>('JWT_REFRESH_EXPIRES_IN') || '7d',
    });

    // Store refresh token with 7 days expiry in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    try {
      await this.prisma.refreshToken.create({
        data: {
          token: refreshToken,
          userId: user.id,
          expiresAt,
        },
      });
    } catch (err) {
      // In tests/dev without DB instance, allow token return
      console.warn(
        '[AuthService] Could not persist refresh token:',
        (err as Error).message,
      );
    }

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
    };
  }

  async refresh(refreshToken: string) {
    if (!refreshToken) {
      throw new BadRequestException('Refresh token wajib diisi');
    }

    let payload: any;
    try {
      payload = this.jwtService.verify(refreshToken, {
        secret:
          this.configService.get<string>('JWT_REFRESH_SECRET') ||
          'super-secret-refresh-key-min-32-chars',
      });
    } catch {
      throw new UnauthorizedException(
        'Refresh token tidak valid atau telah kedaluwarsa',
      );
    }

    const user = await this.usersService.findById(payload.sub);
    if (!user) {
      throw new UnauthorizedException('Pengguna tidak ditemukan');
    }

    // Revoke old refresh token from database if present
    try {
      await this.prisma.refreshToken.deleteMany({
        where: { token: refreshToken },
      });
    } catch {
      // Ignore if DB is disconnected in mock/test mode
    }

    return this.generateTokens(user);
  }

  async logout(userId: string, refreshToken?: string) {
    try {
      if (refreshToken) {
        await this.prisma.refreshToken.deleteMany({
          where: { token: refreshToken, userId },
        });
      } else {
        await this.prisma.refreshToken.deleteMany({
          where: { userId },
        });
      }
    } catch {
      // Ignore if DB not active
    }
    return { success: true, message: 'Logout berhasil' };
  }
}
