import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePickDto } from './dto/create-pick.dto';
import { UpdatePickDto } from './dto/update-pick.dto';
import { EntrySource, PickStatus } from '@prisma/client';

@Injectable()
export class PicksService {
  constructor(private readonly prisma: PrismaService) {}

  async create(tournamentId: string, dto: CreatePickDto) {
    // 1. Validate tournament existence
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) {
      throw new NotFoundException(
        `Turnamen dengan ID ${tournamentId} tidak ditemukan`,
      );
    }

    // 2. Validate participant existence & enrollment
    const participant = await this.prisma.participant.findUnique({
      where: { id: dto.participantId },
    });
    if (!participant) {
      throw new NotFoundException(
        `Peserta dengan ID ${dto.participantId} tidak ditemukan`,
      );
    }

    const membership = await this.prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_participantId: {
          tournamentId,
          participantId: dto.participantId,
        },
      },
    });
    if (!membership) {
      throw new BadRequestException(
        `Peserta '${participant.name}' belum terdaftar dalam turnamen ini`,
      );
    }

    // 3. Validate stock existence & active status
    const stock = await this.prisma.stock.findUnique({
      where: { id: dto.stockId },
    });
    if (!stock) {
      throw new NotFoundException(
        `Saham dengan ID ${dto.stockId} tidak ditemukan`,
      );
    }
    if (!stock.isActive) {
      throw new BadRequestException(
        `Saham ${stock.symbol} saat ini sedang tidak aktif dan tidak dapat dipilih`,
      );
    }

    // 4. Validate trading date is within tournament duration
    // Parse YYYY-MM-DD cleanly to avoid timezone shifting
    const dateStr = dto.tradingDate.substring(0, 10);
    const tradingDateObj = new Date(`${dateStr}T00:00:00.000Z`);

    const startStr = tournament.startDate.toISOString().substring(0, 10);
    const endStr = tournament.endDate.toISOString().substring(0, 10);

    if (dateStr < startStr || dateStr > endStr) {
      throw new BadRequestException(
        `Tanggal perdagangan (${dateStr}) berada di luar periode turnamen (${startStr} s/d ${endStr})`,
      );
    }

    // 5. Check duplicate pick rule: [tournamentId, participantId, tradingDate, stockId]
    const existingPick = await this.prisma.stockPick.findUnique({
      where: {
        tournamentId_participantId_tradingDate_stockId: {
          tournamentId,
          participantId: dto.participantId,
          tradingDate: tradingDateObj,
          stockId: dto.stockId,
        },
      },
    });

    if (existingPick) {
      throw new ConflictException(
        `Peserta '${participant.name}' sudah memilih saham ${stock.symbol} pada tanggal ${dateStr} di turnamen ini`,
      );
    }

    // 6. Create stock pick
    return this.prisma.stockPick.create({
      data: {
        tournamentId,
        participantId: dto.participantId,
        stockId: dto.stockId,
        tradingDate: tradingDateObj,
        entryPrice: dto.entryPrice,
        entryTimestamp: dto.entryTimestamp
          ? new Date(dto.entryTimestamp)
          : null,
        entrySource: dto.entrySource || EntrySource.MARKET_OPEN,
        status: dto.status || PickStatus.CONFIRMED,
      },
      include: {
        participant: true,
        stock: true,
        tournament: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });
  }

  async findAll(
    tournamentId: string,
    filters?: {
      tradingDate?: string;
      participantId?: string;
      stockId?: string;
      status?: PickStatus;
    },
  ) {
    const where: any = { tournamentId };

    if (filters?.tradingDate) {
      const dateStr = filters.tradingDate.substring(0, 10);
      where.tradingDate = new Date(`${dateStr}T00:00:00.000Z`);
    }

    if (filters?.participantId) {
      where.participantId = filters.participantId;
    }

    if (filters?.stockId) {
      where.stockId = filters.stockId;
    }

    if (filters?.status) {
      where.status = filters.status;
    }

    return this.prisma.stockPick.findMany({
      where,
      orderBy: [{ tradingDate: 'desc' }, { createdAt: 'desc' }],
      include: {
        participant: true,
        stock: true,
        _count: {
          select: { evaluations: true },
        },
      },
    });
  }

  async findOne(id: string) {
    const pick = await this.prisma.stockPick.findUnique({
      where: { id },
      include: {
        participant: true,
        stock: true,
        tournament: {
          include: { rules: true },
        },
        evaluations: true,
      },
    });

    if (!pick) {
      throw new NotFoundException(`Stock pick dengan ID ${id} tidak ditemukan`);
    }

    return pick;
  }

  async update(id: string, dto: UpdatePickDto) {
    await this.findOne(id);

    return this.prisma.stockPick.update({
      where: { id },
      data: {
        ...(dto.entryPrice !== undefined && { entryPrice: dto.entryPrice }),
        ...(dto.entryTimestamp !== undefined && {
          entryTimestamp: dto.entryTimestamp
            ? new Date(dto.entryTimestamp)
            : null,
        }),
        ...(dto.entrySource && { entrySource: dto.entrySource }),
        ...(dto.status && { status: dto.status }),
      },
      include: {
        participant: true,
        stock: true,
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.stockPick.delete({
      where: { id },
    });
  }
}
