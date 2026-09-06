import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

export class UpdateUserRoleDto {
  role: Role;
}

@ApiTags('users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@ApiBearerAuth('JWT-auth')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({
    summary: 'Dapatkan daftar seluruh pengguna terdaftar (Admin only)',
  })
  @ApiQuery({ name: 'search', required: false, description: 'Cari nama atau email' })
  @ApiQuery({ name: 'role', required: false, enum: Role, description: 'Filter berdasarkan role' })
  @ApiResponse({ status: 200, description: 'Daftar pengguna berhasil diambil' })
  async findAll(
    @Query('search') search?: string,
    @Query('role') role?: Role,
  ) {
    return this.usersService.findAll({ search, role });
  }

  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Ubah role pengguna (Promosi ke ADMIN atau demosi ke USER) (Admin only)',
  })
  @ApiResponse({ status: 200, description: 'Role pengguna berhasil diperbarui' })
  async updateRole(
    @Param('id') id: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    if (!dto.role || (dto.role !== Role.ADMIN && dto.role !== Role.USER)) {
      throw new BadRequestException('Role harus ADMIN atau USER');
    }
    return this.usersService.updateRole(id, dto.role);
  }
}
