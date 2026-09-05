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
import { ParticipantsService } from './participants.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';
import { EnrollParticipantDto } from './dto/enroll-participant.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
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
}
