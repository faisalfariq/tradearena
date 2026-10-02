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
import { StocksService } from './stocks.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';

@ApiTags('Stocks (Emiten Saham IDX)')
@Controller('stocks')
export class StocksController {
  constructor(private readonly stocksService: StocksService) {}

  @Get()
  @ApiOperation({
    summary: 'Daftar katalog saham IDX dengan pencarian ticker/nama',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    description: 'Search ticker atau nama',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: Boolean,
    description: 'Filter status aktif',
  })
  @ApiResponse({ status: 200, description: 'Daftar emiten saham' })
  async findAll(
    @Query('search') search?: string,
    @Query('isActive') isActive?: string,
  ) {
    const activeBool =
      isActive === 'true' ? true : isActive === 'false' ? false : undefined;
    return this.stocksService.findAll(search, activeBool);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detail emiten saham berdasarkan ID' })
  @ApiResponse({ status: 200, description: 'Detail saham' })
  @ApiResponse({ status: 404, description: 'Saham tidak ditemukan' })
  async findOne(@Param('id') id: string) {
    return this.stocksService.findOne(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Tambah emiten saham baru (Admin only)' })
  @ApiResponse({ status: 201, description: 'Saham berhasil ditambahkan' })
  @ApiResponse({ status: 409, description: 'Simbol saham sudah terdaftar' })
  async create(@Body() dto: CreateStockDto) {
    return this.stocksService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Perbarui data emiten saham (Admin only)' })
  @ApiResponse({ status: 200, description: 'Saham berhasil diperbarui' })
  @ApiResponse({ status: 404, description: 'Saham tidak ditemukan' })
  async update(@Param('id') id: string, @Body() dto: UpdateStockDto) {
    return this.stocksService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Hapus / non-aktifkan emiten saham (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Saham berhasil dihapus / dinonaktifkan',
  })
  async delete(@Param('id') id: string) {
    return this.stocksService.delete(id);
  }

  @Post('sync-idx')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: 'Sinkronisasi seluruh daftar master emiten IDX resmi (~950+ saham aktif)',
  })
  @ApiResponse({
    status: 200,
    description: 'Daftar emiten IDX berhasil disinkronkan ke database',
  })
  async syncIdxStocks() {
    return this.stocksService.syncIdxStocks();
  }
}
