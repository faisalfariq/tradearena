import { Controller, Get, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Admin Operations Dashboard')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary:
      'Ambil metrik dan statistik operasional platform TradeArena (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Metrik dashboard berhasil diambil',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized — Token JWT tidak valid atau tidak disertakan',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden — Memerlukan hak akses Admin',
  })
  async getDashboardStats() {
    return this.dashboardService.getDashboardStats();
  }
}
