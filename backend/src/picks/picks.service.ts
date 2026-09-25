import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePickDto } from './dto/create-pick.dto';
import { UpdatePickDto } from './dto/update-pick.dto';
import { SubmitMyPickDto } from './dto/submit-my-pick.dto';
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
    if (!membership || membership.status !== 'APPROVED') {
      throw new BadRequestException(
        membership?.status === 'DISQUALIFIED'
          ? `Peserta '${participant.name}' telah didiskualifikasi dari turnamen ini dan tidak dapat mengirim pick`
          : `Peserta '${participant.name}' belum memiliki status APPROVED dalam turnamen ini`,
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

  // --- PARTICIPANT SELF-SERVICE METHODS (08:45 WIB LOCK) ---

  private getWibTimeInfo(tradingDateStr?: string) {
    const now = new Date();
    const todayWib = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

    const timeWib = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Asia/Jakarta',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(now);

    const dateStr = tradingDateStr
      ? tradingDateStr.substring(0, 10)
      : todayWib;

    const bypassLock = process.env.BYPASS_PICK_LOCK === 'true';

    let isLocked = false;
    if (!bypassLock) {
      if (dateStr < todayWib) {
        isLocked = true;
      } else if (dateStr === todayWib && timeWib >= '08:45:00') {
        isLocked = true;
      }
    }

    return {
      now,
      todayWib,
      timeWib,
      dateStr,
      isLocked,
      bypassLock,
    };
  }

  async resolveParticipantForUser(userId: string) {
    let participant = await this.prisma.participant.findFirst({
      where: {
        OR: [{ userId }, { user: { id: userId } }],
      },
    });

    if (!participant) {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user) {
        throw new NotFoundException('Pengguna tidak ditemukan');
      }

      participant = await this.prisma.participant.findFirst({
        where: { email: user.email },
      });

      if (participant) {
        participant = await this.prisma.participant.update({
          where: { id: participant.id },
          data: { userId: user.id },
        });
      } else {
        participant = await this.prisma.participant.create({
          data: {
            name: user.name,
            email: user.email,
            userId: user.id,
          },
        });
      }
    }

    return participant;
  }

  async getMyPickStatus(
    tournamentId: string,
    userId: string,
    tradingDate?: string,
  ) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { rules: true },
    });
    if (!tournament) {
      throw new NotFoundException(
        `Turnamen dengan ID ${tournamentId} tidak ditemukan`,
      );
    }

    const participant = await this.resolveParticipantForUser(userId);

    const membership = await this.prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_participantId: {
          tournamentId,
          participantId: participant.id,
        },
      },
    });

    const timeInfo = this.getWibTimeInfo(tradingDate);
    const dateObj = new Date(`${timeInfo.dateStr}T00:00:00.000Z`);

    let pick = null;
    let pastPicks: any[] = [];

    if (membership && membership.status === 'APPROVED') {
      pick = await this.prisma.stockPick.findFirst({
        where: {
          tournamentId,
          participantId: participant.id,
          tradingDate: dateObj,
        },
        include: {
          stock: true,
          evaluations: true,
        },
      });

      pastPicks = await this.prisma.stockPick.findMany({
        where: {
          tournamentId,
          participantId: participant.id,
        },
        orderBy: { tradingDate: 'desc' },
        include: {
          stock: true,
          evaluations: true,
        },
        take: 30,
      });
    }

    return {
      enrolled: !!membership,
      membershipStatus: membership ? membership.status : 'NOT_ENROLLED',
      isApproved: membership?.status === 'APPROVED',
      participant: {
        id: participant.id,
        name: participant.name,
        email: participant.email,
      },
      tradingDate: timeInfo.dateStr,
      todayWib: timeInfo.todayWib,
      timeWib: timeInfo.timeWib,
      isLocked: timeInfo.isLocked,
      lockCutoff: '08:45:00 WIB',
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        rules: tournament.rules,
      },
      pick,
      pastPicks,
    };
  }

  async submitMyPick(
    tournamentId: string,
    userId: string,
    dto: SubmitMyPickDto,
  ) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { rules: true },
    });
    if (!tournament) {
      throw new NotFoundException(
        `Turnamen dengan ID ${tournamentId} tidak ditemukan`,
      );
    }

    const participant = await this.resolveParticipantForUser(userId);

    const membership = await this.prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_participantId: {
          tournamentId,
          participantId: participant.id,
        },
      },
    });

    if (!membership || membership.status !== 'APPROVED') {
      if (membership?.status === 'DISQUALIFIED') {
        throw new BadRequestException(
          'Akun Anda telah didiskualifikasi dari turnamen ini dan tidak dapat mengirim pick',
        );
      }
      if (membership?.status === 'PENDING') {
        throw new BadRequestException(
          'Pendaftaran Anda pada turnamen ini masih berstatus PENDING (menunggu persetujuan Admin)',
        );
      }
      if (membership?.status === 'REJECTED') {
        throw new BadRequestException(
          'Pendaftaran Anda pada turnamen ini telah ditolak oleh Admin',
        );
      }
      throw new BadRequestException(
        'Anda belum terdaftar sebagai peserta aktif (APPROVED) pada turnamen ini',
      );
    }

    // Check lock cutoff
    const timeInfo = this.getWibTimeInfo(dto.tradingDate);
    if (timeInfo.isLocked) {
      throw new ForbiddenException(
        `Pengiriman pick untuk tanggal ${timeInfo.dateStr} telah dikunci sejak pukul 08:45 WIB.`,
      );
    }

    // Check stock
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

    // Validate trading date within tournament range
    const startStr = tournament.startDate.toISOString().substring(0, 10);
    const endStr = tournament.endDate.toISOString().substring(0, 10);
    if (timeInfo.dateStr < startStr || timeInfo.dateStr > endStr) {
      throw new BadRequestException(
        `Tanggal perdagangan (${timeInfo.dateStr}) berada di luar periode turnamen (${startStr} s/d ${endStr})`,
      );
    }

    const tradingDateObj = new Date(`${timeInfo.dateStr}T00:00:00.000Z`);

    // Check if participant already has a pick on this date in this tournament
    const existingPick = await this.prisma.stockPick.findFirst({
      where: {
        tournamentId,
        participantId: participant.id,
        tradingDate: tradingDateObj,
      },
    });

    const entryPrice = dto.entryPrice || 1000;
    const entrySource = dto.entrySource || EntrySource.MARKET_OPEN;

    if (existingPick) {
      // Update existing pick
      return this.prisma.stockPick.update({
        where: { id: existingPick.id },
        data: {
          stockId: dto.stockId,
          entryPrice,
          entrySource,
          updatedAt: new Date(),
        },
        include: {
          participant: true,
          stock: true,
          tournament: {
            select: { id: true, name: true, status: true },
          },
        },
      });
    }

    // Create new pick
    return this.prisma.stockPick.create({
      data: {
        tournamentId,
        participantId: participant.id,
        stockId: dto.stockId,
        tradingDate: tradingDateObj,
        entryPrice,
        entrySource,
        status: PickStatus.CONFIRMED,
      },
      include: {
        participant: true,
        stock: true,
        tournament: {
          select: { id: true, name: true, status: true },
        },
      },
    });
  }

  async cancelMyPick(tournamentId: string, userId: string, pickId: string) {
    const pick = await this.prisma.stockPick.findUnique({
      where: { id: pickId },
      include: { participant: true },
    });
    if (!pick) {
      throw new NotFoundException(`Stock pick tidak ditemukan`);
    }

    const participant = await this.resolveParticipantForUser(userId);
    if (pick.participantId !== participant.id) {
      throw new ForbiddenException(
        'Anda tidak memiliki akses untuk membatalkan pick ini',
      );
    }

    const dateStr = pick.tradingDate.toISOString().substring(0, 10);
    const timeInfo = this.getWibTimeInfo(dateStr);
    if (timeInfo.isLocked) {
      throw new ForbiddenException(
        'Tidak dapat membatalkan pick yang sudah terkunci (setelah 08:45 WIB)',
      );
    }

    return this.prisma.stockPick.delete({
      where: { id: pickId },
    });
  }

  async getMyActiveTournamentsSummary(userId: string) {
    const participant = await this.resolveParticipantForUser(userId);
    const memberships = await this.prisma.tournamentParticipant.findMany({
      where: {
        participantId: participant.id,
        status: 'APPROVED',
      },
      include: {
        tournament: {
          include: { rules: true },
        },
      },
      orderBy: { tournament: { startDate: 'desc' } },
    });

    const timeInfo = this.getWibTimeInfo();
    const todayObj = new Date(`${timeInfo.todayWib}T00:00:00.000Z`);

    const result = await Promise.all(
      memberships.map(async (m) => {
        const todayPick = await this.prisma.stockPick.findFirst({
          where: {
            tournamentId: m.tournamentId,
            participantId: participant.id,
            tradingDate: todayObj,
          },
          include: {
            stock: true,
            evaluations: true,
          },
        });

        return {
          tournamentId: m.tournament.id,
          tournamentName: m.tournament.name,
          tournamentStatus: m.tournament.status,
          startDate: m.tournament.startDate,
          endDate: m.tournament.endDate,
          rules: m.tournament.rules,
          joinedAt: m.joinedAt,
          todayPick,
          todayWib: timeInfo.todayWib,
          timeWib: timeInfo.timeWib,
          isLocked: timeInfo.isLocked,
        };
      }),
    );

    return result;
  }
}

