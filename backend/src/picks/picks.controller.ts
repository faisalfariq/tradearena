import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
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
import { PicksService } from './picks.service';
import { CreatePickDto } from './dto/create-pick.dto';
import { UpdatePickDto } from './dto/update-pick.dto';
import { SubmitMyPickDto } from './dto/submit-my-pick.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, PickStatus } from '@prisma/client';

@ApiTags('Stock Picks (Pilihan Saham Harian)')
@Controller()
export class PicksController {
  constructor(private readonly picksService: PicksService) {}

  @Get('tournaments/:tournamentId/picks')
  @ApiOperation({ summary: 'Daftar stock picks pada turnamen tertentu' })
  @ApiQuery({
    name: 'tradingDate',
    required: false,
    description: 'Filter tanggal (YYYY-MM-DD)',
  })
  @ApiQuery({
    name: 'participantId',
    required: false,
    description: 'Filter ID peserta',
  })
  @ApiQuery({
    name: 'stockId',
    required: false,
    description: 'Filter ID emiten saham',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: PickStatus,
    description: 'Filter status pick',
  })
  @ApiResponse({ status: 200, description: 'Daftar stock picks' })
  async findAll(
    @Param('tournamentId') tournamentId: string,
    @Query('tradingDate') tradingDate?: string,
    @Query('participantId') participantId?: string,
    @Query('stockId') stockId?: string,
    @Query('status') status?: PickStatus,
  ) {
    return this.picksService.findAll(tournamentId, {
      tradingDate,
      participantId,
      stockId,
      status,
    });
  }

  @Post('tournaments/:tournamentId/picks')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Buat/submit stock pick peserta baru (Admin only)' })
  @ApiResponse({ status: 201, description: 'Stock pick berhasil disimpan' })
  @ApiResponse({
    status: 400,
    description: 'Peserta belum terdaftar atau tanggal di luar durasi turnamen',
  })
  @ApiResponse({
    status: 404,
    description: 'Turnamen, peserta, atau saham tidak ditemukan',
  })
  @ApiResponse({
    status: 409,
    description: 'Peserta sudah memilih saham ini pada tanggal yang sama',
  })
  async create(
    @Param('tournamentId') tournamentId: string,
    @Body() dto: CreatePickDto,
  ) {
    return this.picksService.create(tournamentId, dto);
  }

  @Get('picks/:id')
  @ApiOperation({ summary: 'Detail stock pick berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Detail stock pick' })
  @ApiResponse({ status: 404, description: 'Stock pick tidak ditemukan' })
  async findOne(@Param('id') id: string) {
    return this.picksService.findOne(id);
  }

  @Put('picks/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Perbarui stock pick (Admin only)' })
  @ApiResponse({ status: 200, description: 'Stock pick berhasil diperbarui' })
  @ApiResponse({ status: 404, description: 'Stock pick tidak ditemukan' })
  async update(@Param('id') id: string, @Body() dto: UpdatePickDto) {
    return this.picksService.update(id, dto);
  }

  @Delete('picks/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Hapus stock pick (Admin only)' })
  @ApiResponse({ status: 200, description: 'Stock pick berhasil dihapus' })
  @ApiResponse({ status: 404, description: 'Stock pick tidak ditemukan' })
  async delete(@Param('id') id: string) {
    return this.picksService.delete(id);
  }

  // --- PARTICIPANT SELF-SERVICE ENDPOINTS ---

  @Get('my-tournaments/picks-overview')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Ringkasan seluruh turnamen aktif yang diikuti user & status pick hari ini',
  })
  @ApiResponse({
    status: 200,
    description: 'Daftar turnamen aktif peserta beserta status pick hari ini',
  })
  async getMyActiveTournamentsSummary(@CurrentUser() user: { id: string }) {
    return this.picksService.getMyActiveTournamentsSummary(user.id);
  }

  @Get('tournaments/:tournamentId/my-pick')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Ambil pick saham peserta untuk turnamen & tanggal tertentu (termasuk status lock 08:45 WIB)',
  })
  @ApiQuery({
    name: 'tradingDate',
    required: false,
    description: 'Tanggal perdagangan (YYYY-MM-DD), default hari ini WIB',
  })
  @ApiResponse({
    status: 200,
    description: 'Status kepesertaan, lock status, dan data pick aktif peserta',
  })
  async getMyPickStatus(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser() user: { id: string },
    @Query('tradingDate') tradingDate?: string,
  ) {
    return this.picksService.getMyPickStatus(tournamentId, user.id, tradingDate);
  }

  @Post('tournaments/:tournamentId/my-pick')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Submit atau perbarui pick saham harian peserta mandiri (Kunci otomatis 08:45 WIB)',
  })
  @ApiResponse({
    status: 201,
    description: 'Stock pick mandiri berhasil disimpan / diperbarui',
  })
  @ApiResponse({
    status: 400,
    description: 'Peserta belum APPROVED atau tanggal di luar durasi turnamen',
  })
  @ApiResponse({
    status: 403,
    description: 'Pick terkunci karena sudah melewati batas waktu 08:45 WIB',
  })
  async submitMyPick(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser() user: { id: string },
    @Body() dto: SubmitMyPickDto,
  ) {
    return this.picksService.submitMyPick(tournamentId, user.id, dto);
  }

  @Delete('tournaments/:tournamentId/my-pick/:pickId')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Batalkan pick saham mandiri sebelum batas waktu 08:45 WIB',
  })
  @ApiResponse({ status: 200, description: 'Stock pick mandiri berhasil dibatalkan' })
  @ApiResponse({
    status: 403,
    description:
      'Tidak dapat membatalkan pick yang sudah terkunci (setelah 08:45 WIB) atau bukan milik user',
  })
  async cancelMyPick(
    @Param('tournamentId') tournamentId: string,
    @Param('pickId') pickId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.picksService.cancelMyPick(tournamentId, user.id, pickId);
  }
}

