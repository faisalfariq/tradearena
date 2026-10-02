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

  // --- PARTICIPANT SELF-SERVICE METHODS (17:00 - 21:00 WIB EVENING PICK WINDOW) ---

  private getWibTimeInfo(tradingDateStr?: string, tournament?: any) {
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

    const rawStart = tournament?.pickWindowStart || '17:00';
    const rawEnd = tournament?.pickWindowEnd || '21:00';
    const windowStart = rawStart.length === 5 ? `${rawStart}:00` : rawStart;
    const windowEnd = rawEnd.length === 5 ? `${rawEnd}:00` : rawEnd;

    const bypassLock = process.env.BYPASS_PICK_LOCK === 'true';

    // Helper: calculate next trading day (skip weekend)
    const getNextTradingDay = (curDateStr: string): string => {
      const cur = new Date(`${curDateStr}T00:00:00.000Z`);
      const day = cur.getUTCDay(); // 0: Sun, 1: Mon, ..., 5: Fri, 6: Sat
      let addDays = 1;
      if (day === 5) addDays = 3; // Fri -> Mon
      else if (day === 6) addDays = 2; // Sat -> Mon
      const next = new Date(cur.getTime() + addDays * 86400000);
      return next.toISOString().substring(0, 10);
    };

    // If picking during evening window (17:00 - 21:00 WIB), the picks are for the next trading session!
    const defaultTargetDate =
      timeWib >= windowStart ? getNextTradingDay(todayWib) : todayWib;

    const dateStr = tradingDateStr
      ? tradingDateStr.substring(0, 10)
      : defaultTargetDate;

    let isLocked = false;
    if (!bypassLock) {
      // Pick window is open between windowStart and windowEnd WIB
      if (timeWib < windowStart || timeWib > windowEnd) {
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
      windowStart,
      windowEnd,
    };
  }

  /**
   * Retrieves today's market closing price for a stock to lock as entry price for the next trading day
   */
  async getStockClosingPrice(stockId: string, referenceDateStr: string): Promise<number> {
    const stock = await this.prisma.stock.findUnique({ where: { id: stockId } });
    if (!stock) return 1000;

    // Check candle on or before referenceDate (today's close)
    const candle = await this.prisma.intradayCandle.findFirst({
      where: {
        symbol: stock.symbol,
        tradingDate: { lte: new Date(`${referenceDateStr}T00:00:00.000Z`) },
      },
      orderBy: [{ tradingDate: 'desc' }, { timestamp: 'desc' }],
    });

    if (candle && candle.close) {
      return Number(candle.close);
    }

    // Fallback to any latest candle
    const latestCandle = await this.prisma.intradayCandle.findFirst({
      where: { symbol: stock.symbol },
      orderBy: { timestamp: 'desc' },
    });

    return latestCandle?.close ? Number(latestCandle.close) : 1000;
  }

  async resolveParticipantForUser(userId: string) {
    // 1. Check by userId
    let participant = await this.prisma.participant.findFirst({
      where: {
        OR: [{ userId }, { user: { id: userId } }],
      },
    });

    if (participant) {
      return participant;
    }

    // 2. Lookup the user
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException('Pengguna tidak ditemukan');
    }

    // 3. Search participant by email (case-insensitive)
    if (user.email) {
      participant = await this.prisma.participant.findFirst({
        where: {
          email: { equals: user.email.trim(), mode: 'insensitive' },
        },
      });
    }

    // 4. Also check if user is already in any tournament participant record
    if (!participant) {
      const tp = await this.prisma.tournamentParticipant.findFirst({
        where: { userId: user.id },
        include: { participant: true },
      });
      if (tp?.participant) {
        participant = tp.participant;
      }
    }

    // 5. If existing participant found, safely link userId without conflict
    if (participant) {
      if (participant.userId !== user.id) {
        try {
          // Unlink any other participant having this userId
          await this.prisma.participant.updateMany({
            where: { userId: user.id, id: { not: participant.id } },
            data: { userId: null },
          });
          participant = await this.prisma.participant.update({
            where: { id: participant.id },
            data: { userId: user.id },
          });
        } catch (e) {
          console.warn('[resolveParticipantForUser] Error linking userId:', (e as Error).message);
        }
      }
      return participant;
    }

    // 6. Otherwise create a participant for this user with safe non-null name
    try {
      const safeName = user.name?.trim() || user.email?.split('@')[0] || 'Peserta';
      participant = await this.prisma.participant.create({
        data: {
          name: safeName,
          email: user.email?.toLowerCase().trim() || null,
          userId: user.id,
        },
      });
    } catch (e) {
      console.warn('[resolveParticipantForUser] Error creating participant:', (e as Error).message);
      participant = await this.prisma.participant.findFirst({
        where: {
          OR: [
            { userId: user.id },
            { email: { equals: user.email, mode: 'insensitive' } },
          ],
        },
      });
    }

    if (!participant) {
      throw new NotFoundException('Gagal menyiapkan profil peserta untuk pengguna');
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

    let membership = await this.prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_participantId: {
          tournamentId,
          participantId: participant.id,
        },
      },
    });

    if (!membership) {
      membership = await this.prisma.tournamentParticipant.findFirst({
        where: {
          tournamentId,
          userId,
        },
      });
      // Heal the linkage if needed
      if (membership && membership.participantId !== participant.id) {
        try {
          await this.prisma.tournamentParticipant.update({
            where: { id: membership.id },
            data: { participantId: participant.id },
          });
        } catch {
          // ignore
        }
      }
    }

    const timeInfo = this.getWibTimeInfo(tradingDate, tournament);
    const dateObj = new Date(`${timeInfo.dateStr}T00:00:00.000Z`);

    let picks: any[] = [];
    let pastPicks: any[] = [];

    if (membership && membership.status === 'APPROVED') {
      picks = await this.prisma.stockPick.findMany({
        where: {
          tournamentId,
          participantId: participant.id,
          tradingDate: dateObj,
        },
        include: {
          stock: true,
          evaluations: true,
        },
        orderBy: { createdAt: 'asc' },
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
        take: 60,
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
      lockCutoff: `${timeInfo.windowEnd.substring(0, 5)} WIB`,
      pickWindow: {
        start: timeInfo.windowStart.substring(0, 5),
        end: timeInfo.windowEnd.substring(0, 5),
        isOpen: !timeInfo.isLocked,
        isLocked: timeInfo.isLocked,
      },
      pickLimits: {
        min: tournament.minPicksPerDay ?? 2,
        max: tournament.maxPicksPerDay ?? 3,
      },
      picks, // Multi-picks list for this date
      pick: picks[0] || null, // Backward compatible single pick
      pastPicks,
      tournament: {
        id: tournament.id,
        name: tournament.name,
        status: tournament.status,
        startDate: tournament.startDate,
        endDate: tournament.endDate,
        completionType: tournament.completionType,
        targetPoints: tournament.targetPoints,
        minPicksPerDay: tournament.minPicksPerDay ?? 2,
        maxPicksPerDay: tournament.maxPicksPerDay ?? 3,
        pickWindowStart: tournament.pickWindowStart || '17:00',
        pickWindowEnd: tournament.pickWindowEnd || '21:00',
        rules: tournament.rules,
      },
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
    const timeInfo = this.getWibTimeInfo(dto.tradingDate, tournament);
    if (timeInfo.isLocked) {
      throw new ForbiddenException(
        `Jendela pick saham dibuka pukul ${timeInfo.windowStart.substring(0, 5)} - ${timeInfo.windowEnd.substring(0, 5)} WIB. Saat ini pengiriman sedang dikunci.`,
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
    const minPicks = tournament.minPicksPerDay ?? 2;
    const maxPicks = tournament.maxPicksPerDay ?? 3;

    // SCENARIO 1: Replace a specific pick
    if (dto.replacePickId && dto.stockId) {
      const existingPick = await this.prisma.stockPick.findUnique({
        where: { id: dto.replacePickId },
      });
      if (!existingPick || existingPick.participantId !== participant.id) {
        throw new NotFoundException('Pick yang akan diganti tidak ditemukan');
      }

      const stock = await this.prisma.stock.findUnique({ where: { id: dto.stockId } });
      if (!stock || !stock.isActive) {
        throw new BadRequestException('Saham tidak valid atau sedang tidak aktif');
      }

      // Check duplicate on the same date
      const duplicatePick = await this.prisma.stockPick.findFirst({
        where: {
          tournamentId,
          participantId: participant.id,
          tradingDate: tradingDateObj,
          stockId: stock.id,
          id: { not: dto.replacePickId },
        },
      });
      if (duplicatePick) {
        throw new ConflictException(`Saham ${stock.symbol} sudah ada di daftar pick Anda pada tanggal ini`);
      }

      const lockedClosePrice = await this.getStockClosingPrice(stock.id, timeInfo.todayWib);

      return this.prisma.stockPick.update({
        where: { id: dto.replacePickId },
        data: {
          stockId: stock.id,
          entryPrice: lockedClosePrice,
          entrySource: EntrySource.CLOSING_PRICE,
          status: PickStatus.CONFIRMED,
          updatedAt: new Date(),
        },
        include: { stock: true },
      });
    }

    // SCENARIO 2: Batch submission of 2-3 stocks at once
    if (dto.stockIds && dto.stockIds.length > 0) {
      if (dto.stockIds.length > maxPicks) {
        throw new BadRequestException(`Maksimal ${maxPicks} emiten per hari untuk turnamen ini`);
      }

      // Check unique
      const uniqueStockIds = Array.from(new Set(dto.stockIds));
      if (uniqueStockIds.length !== dto.stockIds.length) {
        throw new BadRequestException('Emiten saham tidak boleh dipilih ganda pada hari yang sama');
      }

      // Remove existing picks on this date and recreate fresh
      await this.prisma.stockPick.deleteMany({
        where: {
          tournamentId,
          participantId: participant.id,
          tradingDate: tradingDateObj,
        },
      });

      const createdPicks = [];
      for (const sId of dto.stockIds) {
        const stock = await this.prisma.stock.findUnique({ where: { id: sId } });
        if (!stock || !stock.isActive) continue;

        const lockedClosePrice = await this.getStockClosingPrice(stock.id, timeInfo.todayWib);

        const newPick = await this.prisma.stockPick.create({
          data: {
            tournamentId,
            participantId: participant.id,
            stockId: stock.id,
            tradingDate: tradingDateObj,
            entryPrice: lockedClosePrice,
            entrySource: EntrySource.CLOSING_PRICE,
            status: PickStatus.CONFIRMED,
          },
          include: { stock: true },
        });
        createdPicks.push(newPick);
      }

      return {
        message: `Berhasil mengunci ${createdPicks.length} pick saham untuk sesi ${timeInfo.dateStr}`,
        picks: createdPicks,
      };
    }

    // SCENARIO 3: Single stock addition
    if (!dto.stockId) {
      throw new BadRequestException('ID Saham wajib diisi');
    }

    const currentPicksCount = await this.prisma.stockPick.count({
      where: {
        tournamentId,
        participantId: participant.id,
        tradingDate: tradingDateObj,
      },
    });

    if (currentPicksCount >= maxPicks) {
      throw new BadRequestException(
        `Anda sudah memilih ${currentPicksCount} emiten (maksimal ${maxPicks} emiten per hari). Hapus atau ganti salah satu emiten terlebih dahulu.`,
      );
    }

    const stock = await this.prisma.stock.findUnique({ where: { id: dto.stockId } });
    if (!stock || !stock.isActive) {
      throw new BadRequestException('Saham tidak valid atau sedang tidak aktif');
    }

    const duplicatePick = await this.prisma.stockPick.findUnique({
      where: {
        tournamentId_participantId_tradingDate_stockId: {
          tournamentId,
          participantId: participant.id,
          tradingDate: tradingDateObj,
          stockId: stock.id,
        },
      },
    });
    if (duplicatePick) {
      throw new ConflictException(`Saham ${stock.symbol} sudah ada di daftar pilihan Anda pada sesi ini`);
    }

    const lockedClosePrice = await this.getStockClosingPrice(stock.id, timeInfo.todayWib);

    return this.prisma.stockPick.create({
      data: {
        tournamentId,
        participantId: participant.id,
        stockId: stock.id,
        tradingDate: tradingDateObj,
        entryPrice: lockedClosePrice,
        entrySource: EntrySource.CLOSING_PRICE,
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
      include: { participant: true, tournament: true },
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
    const timeInfo = this.getWibTimeInfo(dateStr, pick.tournament);
    if (timeInfo.isLocked) {
      throw new ForbiddenException(
        `Tidak dapat membatalkan pick di luar jendela waktu (${timeInfo.windowStart.substring(0, 5)} - ${timeInfo.windowEnd.substring(0, 5)} WIB)`,
      );
    }

    return this.prisma.stockPick.delete({
      where: { id: pickId },
    });
  }

  async getMyActiveTournamentsSummary(userId: string) {
    try {
      const participant = await this.resolveParticipantForUser(userId);
      if (!participant) {
        return [];
      }

      const memberships = await this.prisma.tournamentParticipant.findMany({
        where: {
          OR: [
            { participantId: participant.id },
            { userId },
          ],
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

      const validMemberships = memberships.filter((m) => m.tournament != null);

      const result = await Promise.all(
        validMemberships.map(async (m) => {
          let todayPick: any = null;
          let todayPicks: any[] = [];
          try {
            todayPicks = await this.prisma.stockPick.findMany({
              where: {
                tournamentId: m.tournamentId,
                participantId: participant.id,
                tradingDate: todayObj,
              },
              include: {
                stock: true,
                evaluations: true,
              },
              orderBy: { createdAt: 'asc' },
            });
            todayPick = todayPicks[0] || null;
          } catch (err) {
            console.error('[getMyActiveTournamentsSummary] Error querying today picks:', err);
          }

          const tourneyTimeInfo = this.getWibTimeInfo(undefined, m.tournament);

          return {
            tournamentId: m.tournament.id,
            tournamentName: m.tournament.name,
            tournamentStatus: m.tournament.status,
            startDate: m.tournament.startDate,
            endDate: m.tournament.endDate,
            completionType: m.tournament.completionType,
            targetPoints: m.tournament.targetPoints ? Number(m.tournament.targetPoints) : null,
            minPicksPerDay: m.tournament.minPicksPerDay ?? 2,
            maxPicksPerDay: m.tournament.maxPicksPerDay ?? 3,
            pickWindowStart: m.tournament.pickWindowStart || '17:00',
            pickWindowEnd: m.tournament.pickWindowEnd || '21:00',
            rules: m.tournament.rules,
            joinedAt: m.joinedAt,
            todayPick,
            todayPicks,
            todayWib: tourneyTimeInfo.todayWib,
            timeWib: tourneyTimeInfo.timeWib,
            isLocked: tourneyTimeInfo.isLocked,
          };
        }),
      );

      return result;
    } catch (err: any) {
      console.error('[getMyActiveTournamentsSummary] Fatal error:', err);
      return [];
    }
  }
}

