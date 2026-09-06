import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { MarketDataService } from './market-data.service';
import { TriggerSyncDto } from './dto/trigger-sync.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Market Data & Intraday Sync')
@Controller()
export class MarketDataController {
  constructor(private readonly marketDataService: MarketDataService) {}

  @Post('tournaments/:tournamentId/market-sync')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Tarik data candle intraday 1-menit untuk seluruh emiten unik turnamen pada tanggal tertentu (Admin only)',
  })
  @ApiResponse({
    status: 201,
    description: 'Sinkronisasi berhasil dijalankan',
  })
  @ApiResponse({
    status: 400,
    description: 'Tanggal di luar durasi turnamen atau tidak ada picks',
  })
  @ApiResponse({
    status: 404,
    description: 'Turnamen tidak ditemukan',
  })
  async triggerSync(
    @Param('tournamentId') tournamentId: string,
    @Body() dto: TriggerSyncDto,
  ) {
    return this.marketDataService.triggerSync(tournamentId, dto);
  }

  @Get('tournaments/:tournamentId/market-sync')
  @ApiOperation({
    summary: 'Daftar riwayat sync run market data pada turnamen',
  })
  @ApiResponse({ status: 200, description: 'Daftar sync runs' })
  async getSyncRuns(@Param('tournamentId') tournamentId: string) {
    return this.marketDataService.getSyncRuns(tournamentId);
  }

  @Get('tournaments/:tournamentId/market-sync/:runId')
  @ApiOperation({
    summary: 'Detail sync run market data beserta item status per-simbol',
  })
  @ApiResponse({ status: 200, description: 'Detail sync run' })
  @ApiResponse({ status: 404, description: 'Sync run tidak ditemukan' })
  async getSyncRunDetail(@Param('runId') runId: string) {
    return this.marketDataService.getSyncRunDetail(runId);
  }

  @Get('market-data/candles')
  @ApiOperation({
    summary: 'Ambil data candle intraday 1-menit yang tersimpan di database',
  })
  @ApiQuery({
    name: 'symbol',
    required: true,
    example: 'BBCA',
    description: 'Ticker saham IDX',
  })
  @ApiQuery({
    name: 'tradingDate',
    required: true,
    example: '2026-09-05',
    description: 'Tanggal perdagangan (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    example: 500,
    description: 'Maksimum bar yang diambil',
  })
  @ApiResponse({ status: 200, description: 'Daftar candle 1-menit kanonikal' })
  async getCandles(
    @Query('symbol') symbol: string,
    @Query('tradingDate') tradingDate: string,
    @Query('limit') limit?: number,
  ) {
    return this.marketDataService.getCandles(
      symbol,
      tradingDate,
      limit ? Number(limit) : 500,
    );
  }
}
