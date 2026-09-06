import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { ResultsService } from './results.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Tournament Results & Points Engine')
@Controller('tournaments/:tournamentId/results')
export class ResultsController {
  constructor(private readonly resultsService: ResultsService) {}

  @Get('daily')
  @ApiOperation({
    summary:
      'Ambil rekap hasil harian (Daily Results) turnamen beserta peringkat harian dan tie-breaking',
  })
  @ApiQuery({
    name: 'tradingDate',
    required: false,
    example: '2026-09-05',
    description:
      'Tanggal perdagangan yang ingin dilihat rekapnya (YYYY-MM-DD). Default ke startDate turnamen jika tidak diisi.',
  })
  @ApiResponse({
    status: 200,
    description: 'Rekap hasil harian berhasil diambil',
  })
  @ApiResponse({
    status: 404,
    description: 'Turnamen tidak ditemukan',
  })
  async getDailyResults(
    @Param('tournamentId') tournamentId: string,
    @Query('tradingDate') tradingDate?: string,
  ) {
    return this.resultsService.getDailyResults(tournamentId, tradingDate);
  }

  @Get('overall')
  @ApiOperation({
    summary:
      'Ambil klasemen keseluruhan (Overall Standings) turnamen dengan total poin, statistik win rate, dan ranking',
  })
  @ApiResponse({
    status: 200,
    description: 'Klasemen keseluruhan berhasil diambil',
  })
  @ApiResponse({
    status: 404,
    description: 'Turnamen tidak ditemukan',
  })
  async getOverallResults(@Param('tournamentId') tournamentId: string) {
    return this.resultsService.getOverallResults(tournamentId);
  }

  @Post('recalculate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Hitung ulang seluruh poin turnamen berdasarkan aturan skoring saat ini (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Poin turnamen berhasil dihitung ulang',
  })
  async recalculateTournamentPoints(
    @Param('tournamentId') tournamentId: string,
  ) {
    return this.resultsService.recalculateTournamentPoints(tournamentId);
  }
}
