import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { AutomationService } from './automation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AutomationScheduler } from './automation.scheduler';
import { UnauthorizedException } from '@nestjs/common';

@ApiTags('Automation & Exception Handling')
@Controller()
export class AutomationController {
  constructor(
    private readonly automationService: AutomationService,
    private readonly automationScheduler: AutomationScheduler,
    private readonly prisma: PrismaService,
  ) {}

  @Post('automation/trigger-daily-pipeline')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Trigger eksternal webhook/cron untuk sinkronisasi data pasar, evaluasi trade, dan kalkulasi klasemen seluruh turnamen aktif',
  })
  @ApiQuery({
    name: 'secret',
    required: false,
    description: 'Kunci rahasia opsional (cocokkan dengan CRON_SECRET di env jika disetel)',
  })
  @ApiQuery({
    name: 'tradingDate',
    required: false,
    description: 'Tanggal evaluasi (YYYY-MM-DD), default ke tanggal hari ini WIB',
  })
  async triggerDailyPipeline(
    @Query('secret') secret?: string,
    @Query('tradingDate') tradingDate?: string,
  ) {
    const configuredSecret = process.env.CRON_SECRET;
    if (configuredSecret && secret !== configuredSecret) {
      throw new UnauthorizedException('Kunci autentikasi cron tidak valid');
    }
    return this.automationScheduler.handlePostMarketCron(tradingDate);
  }

  @Post('tournaments/:tournamentId/pipeline/run')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Jalankan pipeline pasca-market harian (Sync Data -> Evaluasi Deterministik -> Hitung Poin) untuk turnamen (Admin only)',
  })
  @ApiQuery({
    name: 'tradingDate',
    required: false,
    example: '2026-09-05',
    description:
      'Tanggal perdagangan yang ingin diproses (YYYY-MM-DD). Default ke startDate turnamen jika dikosongkan.',
  })
  @ApiResponse({
    status: 200,
    description: 'Pipeline harian pasca-market berhasil dijalankan',
  })
  async runPipeline(
    @Param('tournamentId') tournamentId: string,
    @Query('tradingDate') tradingDate?: string,
    @Body() body?: { tradingDate?: string },
    @Req() req?: any,
  ) {
    const adminId = req?.user?.id;
    const effectiveDate = tradingDate || body?.tradingDate;
    return this.automationService.runDailyPipeline(
      tournamentId,
      effectiveDate,
      adminId,
    );
  }

  @Get('tournaments/:tournamentId/exceptions')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Ambil daftar stock pick yang mengalami exception (REVIEW_REQUIRED atau PENDING_DATA) (Admin only)',
  })
  @ApiQuery({
    name: 'tradingDate',
    required: false,
    example: '2026-09-05',
  })
  @ApiResponse({
    status: 200,
    description: 'Daftar exception berhasil diambil',
  })
  async getExceptions(
    @Param('tournamentId') tournamentId: string,
    @Query('tradingDate') tradingDate?: string,
  ) {
    return this.automationService.getExceptions(tournamentId, tradingDate);
  }

  @Post('evaluations/:id/retry')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Coba ulang (retry) penarikan data dan evaluasi untuk satu trade evaluation yang gagal atau berstatus exception (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Coba ulang evaluasi trade berhasil dijalankan',
  })
  async retryEvaluation(@Param('id') id: string, @Req() req?: any) {
    const adminId = req?.user?.id;
    return this.automationService.retryEvaluation(id, adminId);
  }

  @Get('tournaments/:tournamentId/audit-trail')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Ambil riwayat audit log operasional turnamen (Pipeline, Override, Retry) (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Riwayat audit log berhasil diambil',
  })
  async getAuditTrail(@Param('tournamentId') tournamentId: string) {
    return this.prisma.auditLog.findMany({
      where: {
        OR: [
          { entityId: tournamentId },
          {
            action: {
              in: [
                'DAILY_POST_MARKET_PIPELINE',
                'RETRY_TRADE_EVALUATION',
                'OVERRIDE_TRADE_EVALUATION',
              ],
            },
          },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
  }
}
