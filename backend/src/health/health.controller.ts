import { Controller, Get, Post } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { Role, TournamentStatus, CandleAmbiguityPolicy, GapPolicy, EntrySource, PickStatus } from '@prisma/client';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @ApiOperation({ summary: 'Check API and system health' })
  @ApiResponse({ status: 200, description: 'System health status' })
  check() {
    return {
      status: 'ok',
      service: 'tradearena-backend',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: '1.0.0',
    };
  }

  @Get('db')
  @ApiOperation({ summary: 'Diagnose database connectivity and counts' })
  async checkDb() {
    try {
      const userCount = await this.prisma.user.count();
      const admin = await this.prisma.user.findFirst({
        where: { role: Role.ADMIN },
        select: { id: true, email: true, name: true, role: true },
      });
      const stockCount = await this.prisma.stock.count();
      const tournamentCount = await this.prisma.tournament.count();

      return {
        database: 'connected',
        userCount,
        stockCount,
        tournamentCount,
        adminFound: !!admin,
        admin,
      };
    } catch (err: any) {
      return {
        database: 'error',
        message: err.message,
        code: err.code,
        meta: err.meta,
      };
    }
  }

  @Post('seed')
  @ApiOperation({ summary: 'Ensure admin user and initial data are seeded' })
  async seed() {
    try {
      const adminEmail = (process.env.ADMIN_EMAIL || 'admin@tradearena.local').toLowerCase();
      const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePass123!';
      const adminName = process.env.ADMIN_NAME || 'TradeArena Super Admin';
      const passwordHash = await bcrypt.hash(adminPassword, 10);

      const admin = await this.prisma.user.upsert({
        where: { email: adminEmail },
        update: {
          name: adminName,
          passwordHash,
          role: Role.ADMIN,
        },
        create: {
          email: adminEmail,
          name: adminName,
          passwordHash,
          role: Role.ADMIN,
        },
        select: { id: true, email: true, name: true, role: true },
      });

      // Seed 5 core IDX stocks
      const initialStocks = [
        { symbol: 'BBCA', name: 'Bank Central Asia Tbk', exchange: 'IDX' },
        { symbol: 'BBRI', name: 'Bank Rakyat Indonesia (Persero) Tbk', exchange: 'IDX' },
        { symbol: 'BMRI', name: 'Bank Mandiri (Persero) Tbk', exchange: 'IDX' },
        { symbol: 'TLKM', name: 'Telkom Indonesia (Persero) Tbk', exchange: 'IDX' },
        { symbol: 'ASII', name: 'Astra International Tbk', exchange: 'IDX' },
      ];
      for (const s of initialStocks) {
        await this.prisma.stock.upsert({
          where: { symbol: s.symbol },
          update: { name: s.name, exchange: s.exchange, isActive: true },
          create: { ...s, isActive: true },
        });
      }

      // Seed demo tournament if none exists
      let tournament = await this.prisma.tournament.findFirst();
      if (!tournament) {
        tournament = await this.prisma.tournament.create({
          data: {
            name: 'BSJP Championship Musim 1 — 2026',
            description:
              'Turnamen resmi stock picking harian komunitas BSJP dengan evaluasi Cut Loss (-3%) & Trailing Stop (-3% dari peak).',
            startDate: new Date('2026-09-01T00:00:00.000Z'),
            endDate: new Date('2026-09-30T23:59:59.000Z'),
            status: TournamentStatus.ACTIVE,
            rules: {
              create: {
                initialStopPct: 0.03,
                trailingStopPct: 0.03,
                candleAmbiguityPolicy: CandleAmbiguityPolicy.CONSERVATIVE_LOSS_FIRST,
                gapPolicy: GapPolicy.ACTUAL_FIRST_VALID_LEVEL,
                priceFractionPolicy: 'IDX_STANDARD_V1',
                pointsRule: 'PERCENTAGE_RETURN_V1',
              },
            },
          },
        });
      }

      return {
        success: true,
        message: 'Seeding successful',
        admin,
        tournamentId: tournament.id,
      };
    } catch (err: any) {
      return {
        success: false,
        error: err.message,
        code: err.code,
      };
    }
  }
}

