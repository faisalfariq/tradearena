import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
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
import { ParticipantsService } from './participants.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { EnrollParticipantDto } from './dto/enroll-participant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role } from '@prisma/client';

@ApiTags('Participants (Peserta Turnamen)')
@Controller()
export class ParticipantsController {
  constructor(private readonly participantsService: ParticipantsService) {}

  @Get('participants')
  @ApiOperation({
    summary: 'Daftar seluruh peserta dengan pencarian nama/email',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Cari nama atau email',
  })
  @ApiResponse({ status: 200, description: 'Daftar peserta' })
  async findAll(@Query('search') search?: string) {
    return this.participantsService.findAll(search);
  }

  @Get('participants/:id')
  @ApiOperation({ summary: 'Detail peserta berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Detail peserta' })
  @ApiResponse({ status: 404, description: 'Peserta tidak ditemukan' })
  async findOne(@Param('id') id: string) {
    return this.participantsService.findOne(id);
  }

  @Post('participants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Tambah peserta baru (Admin only)' })
  @ApiResponse({ status: 201, description: 'Peserta berhasil dibuat' })
  @ApiResponse({ status: 409, description: 'Email sudah terdaftar' })
  async create(@Body() dto: CreateParticipantDto) {
    return this.participantsService.create(dto);
  }

  @Put('participants/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Perbarui data peserta (Admin only)' })
  @ApiResponse({ status: 200, description: 'Peserta berhasil diperbarui' })
  @ApiResponse({ status: 404, description: 'Peserta tidak ditemukan' })
  async update(@Param('id') id: string, @Body() dto: UpdateParticipantDto) {
    return this.participantsService.update(id, dto);
  }

  @Delete('participants/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Hapus peserta (Admin only)' })
  @ApiResponse({ status: 200, description: 'Peserta berhasil dihapus' })
  async delete(@Param('id') id: string) {
    return this.participantsService.delete(id);
  }

  // --- Tournament Membership Endpoints ---

  @Get('tournaments/:tournamentId/participants')
  @ApiOperation({
    summary: 'Daftar peserta yang terdaftar pada turnamen tertentu',
  })
  @ApiResponse({ status: 200, description: 'Daftar peserta turnamen' })
  @ApiResponse({ status: 404, description: 'Turnamen tidak ditemukan' })
  async getTournamentParticipants(@Param('tournamentId') tournamentId: string) {
    return this.participantsService.getTournamentParticipants(tournamentId);
  }

  @Post('tournaments/:tournamentId/participants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Daftarkan peserta ke turnamen (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Peserta berhasil didaftarkan ke turnamen',
  })
  @ApiResponse({
    status: 404,
    description: 'Turnamen atau peserta tidak ditemukan',
  })
  @ApiResponse({
    status: 409,
    description: 'Peserta sudah terdaftar di turnamen ini',
  })
  async enroll(
    @Param('tournamentId') tournamentId: string,
    @Body() dto: EnrollParticipantDto,
  ) {
    return this.participantsService.enroll(tournamentId, dto.participantId);
  }

  @Delete('tournaments/:tournamentId/participants/:participantId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Keluarkan peserta dari turnamen (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Peserta dikeluarkan dari turnamen',
  })
  @ApiResponse({
    status: 404,
    description: 'Peserta tidak terdaftar di turnamen',
  })
  async unenroll(
    @Param('tournamentId') tournamentId: string,
    @Param('participantId') participantId: string,
  ) {
    return this.participantsService.unenroll(tournamentId, participantId);
  }

  @Post('tournaments/:tournamentId/apply')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'User mengajukan diri mendaftar ke turnamen (Apply as Participant)' })
  @ApiResponse({ status: 200, description: 'Permohonan pendaftaran berhasil diajukan' })
  async apply(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.participantsService.applyToTournament(tournamentId, user.id);
  }

  @Get('tournaments/:tournamentId/my-status')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Cek status pendaftaran user saat ini pada turnamen tertentu' })
  @ApiResponse({ status: 200, description: 'Status pendaftaran turnamen' })
  async getMyStatus(
    @Param('tournamentId') tournamentId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.participantsService.getMyTournamentStatus(tournamentId, user.id);
  }

  @Get('tournaments/:tournamentId/applicants')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Daftar seluruh pendaftar turnamen (Admin only)' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter status (PENDING, APPROVED, REJECTED)' })
  @ApiResponse({ status: 200, description: 'Daftar pelamar turnamen berhasil diambil' })
  async getApplicants(
    @Param('tournamentId') tournamentId: string,
    @Query('status') status?: any,
  ) {
    return this.participantsService.getApplicants(tournamentId, status);
  }

  @Patch('tournaments/:tournamentId/applicants/:participantId/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Persetujuan / Penolakan peserta turnamen oleh Admin (Approve/Reject)' })
  @ApiResponse({ status: 200, description: 'Status aplikasi peserta berhasil diperbarui' })
  async reviewApplicant(
    @Param('tournamentId') tournamentId: string,
    @Param('participantId') participantId: string,
    @Body() body: { status: 'APPROVED' | 'REJECTED'; reviewNotes?: string },
    @CurrentUser() user: { id: string },
  ) {
    return this.participantsService.reviewApplicant(
      tournamentId,
      participantId,
      body.status,
      user.id,
      body.reviewNotes,
    );
  }
}
