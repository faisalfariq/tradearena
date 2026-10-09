import {
  Injectable,
  NotFoundException,
  ConflictException,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStockDto } from './dto/create-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';

@Injectable()
export class StocksService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    // Auto-heal stock boards from bundled IDX catalog if currently set to 'Utama'
    try {
      const catalog = require('./data/idx-stocks.json');
      const nonUtama = catalog.filter(
        (s: any) => s.board && s.board.toLowerCase() !== 'utama',
      );
      for (const item of nonUtama) {
        await this.prisma.stock.updateMany({
          where: { symbol: item.symbol, board: 'Utama' },
          data: { board: item.board },
        });
      }
    } catch {}
  }

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
        board: dto.board?.trim() || 'Utama',
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
        ...(dto.board && { board: dto.board.trim() }),
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

  async syncIdxStocks() {
    let stockList: Array<{ symbol: string; name: string; exchange: string; board?: string; isActive?: boolean }> = [];

    // 1. Try to fetch live list from official/open dataset
    try {
      const response = await fetch(
        'https://raw.githubusercontent.com/wildangunawan/Dataset-Saham-IDX/master/List%20Emiten/all.csv',
        { headers: { 'User-Agent': 'TradeArena' } },
      );
      if (response.ok) {
        const csv = await response.text();
        const lines = csv.trim().split('\n');
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          const parts = line.split(',');
          if (parts.length >= 2) {
            const code = parts[0].trim().toUpperCase();
            let name = parts.slice(1, parts.length - 3).join(',').trim();
            if (!name) name = parts[1].trim();
            name = name.replace(/^"|"$/g, '').trim();
            const listingBoard = parts[parts.length - 1]?.trim() || 'Utama';
            if (code && code.length >= 4) {
              stockList.push({
                symbol: code,
                name: name || code,
                exchange: 'IDX',
                board: listingBoard,
                isActive: true,
              });
            }
          }
        }
      }
    } catch (err) {
      console.warn('[StocksService] Failed to fetch live IDX stock list, falling back to local dataset:', err);
    }

    // 2. Fallback to local bundled idx-stocks.json if network fetch empty
    if (stockList.length === 0) {
      try {
        const localData = require('./data/idx-stocks.json');
        stockList = localData;
      } catch (e) {
        console.error('[StocksService] Failed to load local idx-stocks.json:', e);
      }
    }

    if (stockList.length === 0) {
      throw new Error('Data master emiten IDX tidak tersedia');
    }

    // 3. Batch upsert into database in chunks of 50
    let inserted = 0;
    let updated = 0;

    const chunkSize = 50;
    for (let i = 0; i < stockList.length; i += chunkSize) {
      const chunk = stockList.slice(i, i + chunkSize);
      await Promise.all(
        chunk.map(async (s) => {
          const existing = await this.prisma.stock.findUnique({
            where: { symbol: s.symbol },
          });
          if (existing) {
            await this.prisma.stock.update({
              where: { id: existing.id },
              data: {
                name: s.name,
                exchange: s.exchange || 'IDX',
                board: s.board || existing.board || 'Utama',
                isActive: true,
              },
            });
            updated++;
          } else {
            await this.prisma.stock.create({
              data: {
                symbol: s.symbol,
                name: s.name,
                exchange: s.exchange || 'IDX',
                board: s.board || 'Utama',
                isActive: true,
              },
            });
            inserted++;
          }
        }),
      );
    }

    return {
      success: true,
      total: stockList.length,
      inserted,
      updated,
      message: `Sinkronisasi berhasil: ${inserted} emiten baru ditambahkan, ${updated} emiten diperbarui (Total: ${stockList.length} emiten IDX aktif)`,
    };
  }
}
