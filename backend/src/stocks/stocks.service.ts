import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Injectable()
export class StocksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateStockDto) {
    const symbol = dto.symbol.trim().toUpperCase();

    const existing = await this.prisma.stock.findUnique({
      where: { symbol },
    });

    if (existing) {
      throw new ConflictException(
        `Saham dengan simbol ${symbol} sudah terdaftar`,
      );
    }

    return this.prisma.stock.create({
      data: {
        symbol,
        name: dto.name.trim(),
        exchange: dto.exchange?.trim().toUpperCase() || 'IDX',
        isActive: dto.isActive !== undefined ? dto.isActive : true,
      },
    });
  }

  async findAll(search?: string, isActive?: boolean) {
    const where: any = {};

    if (isActive !== undefined) {
      where.isActive = isActive;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { symbol: { contains: term, mode: 'insensitive' } },
        { name: { contains: term, mode: 'insensitive' } },
      ];
    }

    return this.prisma.stock.findMany({
      where,
      orderBy: { symbol: 'asc' },
    });
  }

  async findOne(id: string) {
    const stock = await this.prisma.stock.findUnique({
      where: { id },
      include: {
        _count: {
          select: { picks: true },
        },
      },
    });

    if (!stock) {
      throw new NotFoundException(`Saham dengan ID ${id} tidak ditemukan`);
    }

    return stock;
  }

  async findBySymbol(symbol: string) {
    return this.prisma.stock.findUnique({
      where: { symbol: symbol.trim().toUpperCase() },
    });
  }

  async update(id: string, dto: UpdateStockDto) {
    await this.findOne(id);

    const symbol = dto.symbol?.trim().toUpperCase();
    if (symbol) {
      const existing = await this.prisma.stock.findUnique({
        where: { symbol },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Saham dengan simbol ${symbol} sudah digunakan`,
        );
      }
    }

    return this.prisma.stock.update({
      where: { id },
      data: {
        ...(symbol && { symbol }),
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.exchange && { exchange: dto.exchange.trim().toUpperCase() }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);

    const picksCount = await this.prisma.stockPick.count({
      where: { stockId: id },
    });

    if (picksCount > 0) {
      // Soft-delete if already referenced by picks to maintain relational integrity
      return this.prisma.stock.update({
        where: { id },
        data: { isActive: false },
      });
    }

    return this.prisma.stock.delete({
      where: { id },
    });
  }
}
