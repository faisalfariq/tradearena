import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
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
import { EvaluationService } from './evaluation.service';
import { EvaluateTournamentDayDto } from './dto/evaluate-tournament-day.dto';
import { OverrideEvaluationDto } from './dto/override-evaluation.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Trade Evaluation Engine')
@Controller()
export class EvaluationController {
  constructor(private readonly evaluationService: EvaluationService) {}

  @Post('tournaments/:tournamentId/evaluations/run')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Jalankan evaluasi trade deterministik untuk seluruh stock pick turnamen pada tanggal tertentu (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Evaluasi berhasil dijalankan untuk seluruh pick',
  })
  @ApiResponse({
    status: 400,
    description: 'Tidak ada stock pick pada tanggal tersebut',
  })
  async evaluateTournamentDay(
    @Param('tournamentId') tournamentId: string,
    @Body() dto: EvaluateTournamentDayDto,
  ) {
    return this.evaluationService.evaluateTournamentDay(
      tournamentId,
      dto.tradingDate,
    );
  }

  @Post('picks/:pickId/evaluate')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Jalankan evaluasi trade deterministik untuk satu stock pick spesifik (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Evaluasi berhasil dijalankan',
  })
  async evaluatePick(@Param('pickId') pickId: string) {
    return this.evaluationService.evaluatePick(pickId);
  }

  @Get('tournaments/:tournamentId/evaluations')
  @ApiOperation({
    summary:
      'Daftar hasil evaluasi trade turnamen beserta return, stop price, dan status',
  })
  @ApiQuery({
    name: 'tradingDate',
    required: false,
    example: '2026-09-05',
    description: 'Filter berdasarkan tanggal perdagangan (YYYY-MM-DD)',
  })
  @ApiResponse({ status: 200, description: 'Daftar hasil evaluasi' })
  async getTournamentEvaluations(
    @Param('tournamentId') tournamentId: string,
    @Query('tradingDate') tradingDate?: string,
  ) {
    return this.evaluationService.getTournamentEvaluations(
      tournamentId,
      tradingDate,
    );
  }

  @Get('evaluations/:id')
  @ApiOperation({
    summary:
      'Detail hasil evaluasi trade lengkap beserta bukti audit (evidence), trigger candle, dan timeline',
  })
  @ApiResponse({ status: 200, description: 'Detail evaluasi dan evidence' })
  @ApiResponse({ status: 404, description: 'Evaluasi tidak ditemukan' })
  async getEvaluationDetail(@Param('id') id: string) {
    return this.evaluationService.getEvaluationDetail(id);
  }

  @Post('evaluations/:id/override')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Penyesuaian manual (override) hasil evaluasi oleh Admin dengan mencatat alasan dan audit log',
  })
  @ApiResponse({
    status: 200,
    description: 'Penyesuaian evaluasi berhasil disimpan',
  })
  async overrideEvaluation(
    @Param('id') id: string,
    @Body() dto: OverrideEvaluationDto,
    @Req() req: any,
  ) {
    const adminId = req.user?.id || req.user?.sub;
    return this.evaluationService.overrideEvaluation(id, dto, adminId);
  }
}
