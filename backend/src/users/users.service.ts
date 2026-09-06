import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, User, AuthProvider } from '@prisma/client';
import * as bcrypt from 'bcrypt';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });
  }

  async findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: {
    email: string;
    password: string;
    name: string;
    role?: Role;
  }): Promise<User> {
    const passwordHash = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        passwordHash,
        name: data.name,
        role: data.role || Role.ADMIN,
        provider: AuthProvider.LOCAL,
      },
    });
  }

  async findOrCreateGoogleUser(data: {
    email: string;
    name: string;
    googleId: string;
    avatarUrl?: string;
  }): Promise<User> {
    const email = data.email.toLowerCase();

    // 1. Check if user with googleId exists
    let user = await this.prisma.user.findFirst({
      where: {
        OR: [{ googleId: data.googleId }, { email }],
      },
    });

    if (user) {
      // If user exists but googleId or avatarUrl wasn't set, link it
      if (!user.googleId || !user.avatarUrl) {
        user = await this.prisma.user.update({
          where: { id: user.id },
          data: {
            googleId: data.googleId,
            avatarUrl: data.avatarUrl || user.avatarUrl,
          },
        });
      }
      return user;
    }

    // 2. Otherwise create a new user with default role USER
    return this.prisma.user.create({
      data: {
        email,
        name: data.name || email.split('@')[0],
        role: Role.USER,
        provider: AuthProvider.GOOGLE,
        googleId: data.googleId,
        avatarUrl: data.avatarUrl,
      },
    });
  }

  async findAll(params?: { search?: string; role?: Role }) {
    const where: any = {};

    if (params?.role) {
      where.role = params.role;
    }

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: 'insensitive' } },
        { email: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        provider: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            tournamentApplications: true,
          },
        },
      },
    });

    return users.map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      provider: u.provider,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt,
      tournamentCount: u._count.tournamentApplications,
    }));
  }

  async updateRole(userId: string, newRole: Role): Promise<User> {
    const user = await this.findById(userId);
    if (!user) {
      throw new NotFoundException(`User dengan ID ${userId} tidak ditemukan`);
    }

    if (newRole !== Role.ADMIN && newRole !== Role.USER) {
      throw new BadRequestException('Role yang diizinkan hanya ADMIN atau USER');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: { role: newRole },
    });
  }
}
