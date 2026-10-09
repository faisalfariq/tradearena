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
import { TournamentsService } from './tournaments.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import { UpdateTournamentStatusDto } from './dto/update-status.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, TournamentStatus } from '@prisma/client';

@ApiTags('Tournaments')
@Controller('tournaments')
export class TournamentsController {
  constructor(private readonly tournamentsService: TournamentsService) {}

  @Get()
  @ApiOperation({
    summary: 'List all tournaments with rules and participant counts',
  })
  @ApiQuery({ name: 'status', enum: TournamentStatus, required: false })
  @ApiResponse({ status: 200, description: 'List of tournaments' })
  async findAll(@Query('status') status?: TournamentStatus) {
    return this.tournamentsService.findAll(status);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get tournament by ID including rules and summary' })
  @ApiResponse({ status: 200, description: 'Tournament details' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  async findOne(@Param('id') id: string) {
    return this.tournamentsService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Create new tournament with explicit trading rules (Admin only)',
  })
  @ApiResponse({ status: 201, description: 'Tournament created successfully' })
  @ApiResponse({
    status: 400,
    description: 'Validation error (e.g. invalid date range)',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden (Requires ADMIN role)' })
  async create(@Body() createTournamentDto: CreateTournamentDto) {
    return this.tournamentsService.create(createTournamentDto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update tournament details and rules (Admin only)' })
  @ApiResponse({ status: 200, description: 'Tournament updated successfully' })
  @ApiResponse({ status: 404, description: 'Tournament not found' })
  async update(
    @Param('id') id: string,
    @Body() updateTournamentDto: UpdateTournamentDto,
  ) {
    return this.tournamentsService.update(id, updateTournamentDto);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Update tournament status (e.g. UPCOMING -> ACTIVE -> COMPLETED)',
  })
  @ApiResponse({ status: 200, description: 'Status updated successfully' })
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateTournamentStatusDto,
  ) {
    return this.tournamentsService.updateStatus(id, updateStatusDto.status);
  }

  @Patch(':id/toggle-pick-window')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Toggle manual pick window override (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Pick window override updated' })
  async togglePickWindow(
    @Param('id') id: string,
    @Body() body?: { forceOpen?: boolean },
  ) {
    return this.tournamentsService.togglePickWindow(id, body?.forceOpen);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Delete tournament (Admin only, non-active)' })
  @ApiResponse({ status: 200, description: 'Tournament deleted' })
  @ApiResponse({
    status: 400,
    description: 'Active tournament cannot be deleted',
  })
  async remove(@Param('id') id: string) {
    return this.tournamentsService.remove(id);
  }
}
