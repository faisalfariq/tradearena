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
import { PriceFractionService } from '../evaluation/services/price-fraction.service';
import { resolveIdxStockBoard } from '../stocks/data/stock-boards';

@Injectable()
export class PicksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly priceFractionService: PriceFractionService,
  ) {}

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

    const board = (stock.board || '').toLowerCase().trim();
    if (board.includes('pemantauan khusus') || board.includes('fca')) {
      throw new BadRequestException(
        `Saham ${stock.symbol} berada di Papan Pemantauan Khusus (Full Call Auction / FCA) dan tidak dapat dipilih dalam turnamen`,
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
    // Otomatis sinkronisasi harga entry dummy (1000) dan penyesuaian tanggal evaluasi
    await this.reconcileExistingPicks(tournamentId);

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

    // Tanggal Evaluasi: Setiap pick selalu dievaluasi pada hari bursa berikutnya (D+1 trading day)!
    const defaultTargetDate = this.calculateNextTradingDay(todayWib);

    const dateStr = tradingDateStr
      ? tradingDateStr.substring(0, 10)
      : defaultTargetDate;

    const [curH, curM] = timeWib.split(/[:.]/).map((v) => parseInt(v, 10));
    const currentMinutes = (curH || 0) * 60 + (curM || 0);

    const [startH, startM] = windowStart.split(/[:.]/).map((v) => parseInt(v, 10));
    const startMinutes = (startH || 0) * 60 + (startM || 0);

    const [endH, endM] = windowEnd.split(/[:.]/).map((v) => parseInt(v, 10));
    const endMinutes = (endH || 0) * 60 + (endM || 0);

    const isForceOpen = tournament?.isPickWindowForceOpen === true;
    let isLocked = false;
    if (!bypassLock && !isForceOpen) {
      // Pick window is open between windowStart and windowEnd WIB
      if (currentMinutes < startMinutes || currentMinutes > endMinutes) {
        isLocked = true;
      }
    }

    return {
      now,
      todayWib,
      timeWib,
      dateStr,
      isLocked,
      isForceOpen,
      bypassLock,
      windowStart,
      windowEnd,
    };
  }

  /**
   * Helper to calculate the next open trading day on IDX (skips weekends and Indonesian market holidays)
   */
  calculateNextTradingDay(curDateStr: string): string {
    const idxHolidays = new Set([
      '2026-01-01', '2026-01-16', '2026-02-17', '2026-03-20', '2026-03-21',
      '2026-03-22', '2026-03-23', '2026-03-24', '2026-04-03', '2026-05-01',
      '2026-05-14', '2026-05-27', '2026-05-31', '2026-06-01', '2026-06-16',
      '2026-08-17', '2026-08-25', '2026-12-25',
    ]);
    let cur = new Date(`${curDateStr}T00:00:00.000Z`);
    while (true) {
      cur = new Date(cur.getTime() + 86400000);
      const day = cur.getUTCDay(); // 0: Sun, 6: Sat
      if (day === 0 || day === 6) continue;
      const curIso = cur.toISOString().substring(0, 10);
      if (idxHolidays.has(curIso)) continue;
      return curIso;
    }
  }

  /**
   * Automatically reconciles existing picks that have dummy prices (1000) or need evaluation date shifting
   */
  async reconcileExistingPicks(tournamentId?: string) {
    try {
      const picksToUpdate = await this.prisma.stockPick.findMany({
        where: {
          ...(tournamentId && { tournamentId }),
          entryPrice: 1000,
        },
        include: { stock: true },
      });

      for (const pick of picksToUpdate) {
        if (pick.stock?.symbol) {
          try {
            const dateStr = pick.tradingDate.toISOString().substring(0, 10);
            const realPrice = await this.getStockClosingPrice(pick.stockId, dateStr);
            if (realPrice && realPrice !== 1000) {
              await this.prisma.stockPick.update({
                where: { id: pick.id },
                data: { entryPrice: realPrice },
              });
            }
          } catch (itemErr) {
            console.warn(`[reconcileExistingPicks] Could not update price for pick ${pick.id}:`, (itemErr as Error).message);
          }
        }
      }

      // Also ensure evaluation date is shifted to next trading day if it was saved as creation date
      const picksWithSameDate = await this.prisma.stockPick.findMany({
        where: {
          ...(tournamentId && { tournamentId }),
        },
      });

      for (const p of picksWithSameDate) {
        const createdStr = p.createdAt.toISOString().substring(0, 10);
        const tradeStr = p.tradingDate.toISOString().substring(0, 10);
        if (createdStr === tradeStr) {
          const nextTradingDate = this.calculateNextTradingDay(createdStr);
          try {
            await this.prisma.stockPick.update({
              where: { id: p.id },
              data: {
                tradingDate: new Date(`${nextTradingDate}T00:00:00.000Z`),
              },
            });
          } catch (itemErr) {
            console.warn(`[reconcileExistingPicks] Could not shift date for pick ${p.id}:`, (itemErr as Error).message);
          }
        }
      }
    } catch (e) {
      console.warn('[reconcileExistingPicks] Notice:', (e as Error).message);
    }
  }

  /**
   * Validates stock pick eligibility:
   * 1. Anti-FCA: Reject if stock is on Papan Pemantauan Khusus (FCA).
   * 2. Anti-Suspensi: Reject if volume is 0 or trading was suspended on today's session.
   * 3. Anti-Closing ARA: Reject if today's closing price reached the official ARA limit price.
   * Returns valid entry price (closing price).
   */
  async validateAndResolveStockPick(
    stock: { id: string; symbol: string; board?: string },
    referenceDateStr: string,
  ): Promise<number> {
    const cleanSymbol = stock.symbol.trim().toUpperCase();
    const symbolJk = `${cleanSymbol}.JK`;

    // Dynamic Board Resolution: uses official IDX categorization
    const resolvedBoard = resolveIdxStockBoard(cleanSymbol, stock.board);
    if (resolvedBoard !== stock.board && typeof this.prisma.stock?.update === 'function') {
      this.prisma.stock
        .update({
          where: { id: stock.id },
          data: { board: resolvedBoard },
        })
        .catch(() => {});
    }

    // 1. Anti-FCA Check
    const boardLower = resolvedBoard.toLowerCase().trim();
    if (boardLower.includes('pemantauan khusus') || boardLower.includes('fca')) {
      throw new BadRequestException(
        `Saham ${cleanSymbol} berada di Papan Pemantauan Khusus (Full Call Auction / FCA) dan tidak dapat dipilih dalam turnamen.`,
      );
    }

    let closePrice: number | null = null;
    let previousClose: number | null = null;
    let volume: number | null = null;
    let isLive = false;

    // Fetch quote from Yahoo Finance
    try {
      const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbolJk)}?interval=1d&range=5d`;
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'application/json',
        },
      });

      if (res.ok) {
        const data = await res.json();
        const meta = data?.chart?.result?.[0]?.meta;
        const validPrice =
          meta?.regularMarketPrice ||
          meta?.chartPreviousClose ||
          meta?.previousClose;

        if (validPrice && Number(validPrice) > 0) {
          closePrice = Math.round(Number(validPrice));

          // Extract previous session close price reliably from candle series
          const quotes = data?.chart?.result?.[0]?.indicators?.quote?.[0];
          const rawCloses = quotes?.close || [];
          const validCloses = rawCloses.filter(
            (c: any) => c != null && Number(c) > 0,
          );

          if (validCloses.length >= 2) {
            // The last entry is today's latest candle, the second-to-last is yesterday's official close!
            previousClose = Math.round(
              Number(validCloses[validCloses.length - 2]),
            );
          } else {
            const prev = meta?.previousClose || meta?.chartPreviousClose;
            if (prev && Number(prev) > 0) {
              previousClose = Math.round(Number(prev));
            }
          }

          // Extract volume reliably from today's session or check if trading was halted/suspended
          const rawVolumes = quotes?.volume || [];
          const timestamps = data?.chart?.result?.[0]?.timestamp || [];
          let todayVolume: number | null = null;

          if (timestamps.length > 0 && rawVolumes.length === timestamps.length) {
            const lastTs = timestamps[timestamps.length - 1];
            const candleDateWib = new Date(lastTs * 1000 + 7 * 3600 * 1000)
              .toISOString()
              .split('T')[0];
            if (candleDateWib === referenceDateStr) {
              const val = rawVolumes[rawVolumes.length - 1];
              todayVolume = val == null ? 0 : Number(val);
            }
          }

          const lastTradeDateWib = meta?.regularMarketTime
            ? new Date(meta.regularMarketTime * 1000 + 7 * 3600 * 1000)
                .toISOString()
                .split('T')[0]
            : null;

          if (todayVolume !== null) {
            volume = todayVolume;
          } else if (lastTradeDateWib && lastTradeDateWib < referenceDateStr) {
            // No trades occurred today on regular market (e.g. suspended by IDX)
            volume = 0;
          } else if (meta?.regularMarketVolume !== undefined) {
            volume = Number(meta.regularMarketVolume);
          }
          isLive = true;

          // Snapshot in DB
          try {
            await this.prisma.intradayCandle.upsert({
              where: {
                symbol_timestamp_provider: {
                  symbol: cleanSymbol,
                  timestamp: new Date(`${referenceDateStr}T16:00:00.000Z`),
                  provider: 'idx_yahoo_finance',
                },
              },
              create: {
                stockId: stock.id,
                symbol: cleanSymbol,
                tradingDate: new Date(`${referenceDateStr}T00:00:00.000Z`),
                timestamp: new Date(`${referenceDateStr}T16:00:00.000Z`),
                open: closePrice,
                high: closePrice,
                low: closePrice,
                close: closePrice,
                volume: volume !== null ? BigInt(volume) : 0n,
                provider: 'idx_yahoo_finance',
              },
              update: {
                close: closePrice,
              },
            });
          } catch {}
        }
      }
    } catch (err) {
      console.warn(`[validateAndResolveStockPick] Yahoo Finance fetch notice for ${cleanSymbol}:`, (err as Error).message);
    }

    // Fallback to candle in DB if live quote unavailable
    if (closePrice === null) {
      const candle = await this.prisma.intradayCandle.findFirst({
        where: {
          symbol: stock.symbol,
          tradingDate: { lte: new Date(`${referenceDateStr}T00:00:00.000Z`) },
        },
        orderBy: [{ tradingDate: 'desc' }, { timestamp: 'desc' }],
      });
      if (candle && candle.close && Number(candle.close) > 0) {
        closePrice = Number(candle.close);
        volume = Number(candle.volume || 0);
      } else {
        closePrice = 1000;
      }
    }

    // 2. Anti-Suspensi Check (If live quote returns volume === 0)
    if (isLive && volume === 0) {
      throw new BadRequestException(
        `Saham ${cleanSymbol} terdeteksi sedang disuspensi atau tidak ada volume perdagangan pada sesi hari ini.`,
      );
    }

    // 3. Anti-Closing ARA Check
    if (previousClose && previousClose > 0 && closePrice > previousClose) {
      if (this.priceFractionService.isClosingAra(closePrice, previousClose, resolvedBoard)) {
        const araLimit = this.priceFractionService.calculateAraPrice(previousClose, resolvedBoard);
        const boardLabel = resolvedBoard ? ` (${resolvedBoard})` : '';
        throw new BadRequestException(
          `Saham ${cleanSymbol}${boardLabel} ditutup di batas Auto Rejection Atas (ARA di Rp ${araLimit}) dan tidak dapat dipilih.`,
        );
      }
    }

    return closePrice;
  }

  /**
   * Retrieves official market closing price for a stock to lock as entry price for the evaluation session
   */
  async getStockClosingPrice(stockId: string, referenceDateStr: string): Promise<number> {
    const stock = await this.prisma.stock.findUnique({ where: { id: stockId } });
    if (!stock) return 1000;
    return this.validateAndResolveStockPick(stock, referenceDateStr);
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
    await this.reconcileExistingPicks(tournamentId);

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
      try {
        await this.prisma.$executeRawUnsafe(
          `ALTER TABLE "stock_picks" ADD COLUMN IF NOT EXISTS "entry_timestamp" TIMESTAMP(3);`
        );
      } catch {}

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
        isForceOpen: timeInfo.isForceOpen ?? false,
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
        isPickWindowForceOpen: tournament.isPickWindowForceOpen ?? false,
        rules: tournament.rules,
      },
    };
  }

  async submitMyPick(
    tournamentId: string,
    userId: string,
    dto: SubmitMyPickDto,
  ) {
    try {
      // Ensure entry_timestamp exists on stock_picks table
      try {
        await this.prisma.$executeRawUnsafe(
          `ALTER TABLE "stock_picks" ADD COLUMN IF NOT EXISTS "entry_timestamp" TIMESTAMP(3);`
        );
      } catch {}

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
        // Fallback: lookup by tournamentId & userId
        membership = await this.prisma.tournamentParticipant.findFirst({
          where: {
            tournamentId,
            userId,
          },
        });
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
      console.log(
        `[submitMyPick] Tournament "${tournament.name}" (${tournament.id}): timeWib=${timeInfo.timeWib}, window=${timeInfo.windowStart}-${timeInfo.windowEnd}, isForceOpen=${timeInfo.isForceOpen}, bypassLock=${timeInfo.bypassLock}, isLocked=${timeInfo.isLocked}`
      );
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

      // Helper to safely create a stock pick with fallback if database enum lacks CLOSING_PRICE
      const safeCreatePick = async (data: any) => {
        try {
          return await this.prisma.stockPick.create({
            data,
            include: {
              participant: true,
              stock: true,
              tournament: {
                select: { id: true, name: true, status: true },
              },
            },
          });
        } catch (createErr: any) {
          const errMsg = createErr?.message || '';
          if (errMsg.includes('entry_timestamp')) {
            try {
              await this.prisma.$executeRawUnsafe(
                `ALTER TABLE "stock_picks" ADD COLUMN IF NOT EXISTS "entry_timestamp" TIMESTAMP(3);`
              );
              return await this.prisma.stockPick.create({
                data,
                include: {
                  participant: true,
                  stock: true,
                  tournament: {
                    select: { id: true, name: true, status: true },
                  },
                },
              });
            } catch {}
          }
          if (errMsg.includes('EntrySource') || errMsg.includes('CLOSING_PRICE') || errMsg.includes('invalid input value for enum')) {
            return await this.prisma.stockPick.create({
              data: {
                ...data,
                entrySource: EntrySource.MARKET_OPEN,
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
          throw createErr;
        }
      };

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

        // Check duplicate on the same date using findFirst with explicit select to avoid missing column issues
        const duplicatePick = await this.prisma.stockPick.findFirst({
          where: {
            tournamentId,
            participantId: participant.id,
            tradingDate: tradingDateObj,
            stockId: stock.id,
            id: { not: dto.replacePickId },
          },
          select: {
            id: true,
            stockId: true,
          },
        });
        if (duplicatePick) {
          throw new ConflictException(`Saham ${stock.symbol} sudah ada di daftar pick Anda pada tanggal ini`);
        }

        const lockedClosePrice = await this.validateAndResolveStockPick(stock, timeInfo.todayWib);

        try {
          return await this.prisma.stockPick.update({
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
        } catch (updateErr: any) {
          return await this.prisma.stockPick.update({
            where: { id: dto.replacePickId },
            data: {
              stockId: stock.id,
              entryPrice: lockedClosePrice,
              entrySource: EntrySource.MARKET_OPEN,
              status: PickStatus.CONFIRMED,
              updatedAt: new Date(),
            },
            include: { stock: true },
          });
        }
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

          const lockedClosePrice = await this.validateAndResolveStockPick(stock, timeInfo.todayWib);

          const newPick = await safeCreatePick({
            tournamentId,
            participantId: participant.id,
            stockId: stock.id,
            tradingDate: tradingDateObj,
            entryPrice: lockedClosePrice,
            entrySource: EntrySource.CLOSING_PRICE,
            status: PickStatus.CONFIRMED,
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

      // Robust duplicate check using findFirst with explicit select to avoid missing column issues
      const duplicatePick = await this.prisma.stockPick.findFirst({
        where: {
          tournamentId,
          participantId: participant.id,
          tradingDate: tradingDateObj,
          stockId: stock.id,
        },
        select: {
          id: true,
          stockId: true,
        },
      });
      if (duplicatePick) {
        throw new ConflictException(`Saham ${stock.symbol} sudah ada di daftar pilihan Anda pada sesi ini`);
      }

      const lockedClosePrice = await this.validateAndResolveStockPick(stock, timeInfo.todayWib);

      return await safeCreatePick({
        tournamentId,
        participantId: participant.id,
        stockId: stock.id,
        tradingDate: tradingDateObj,
        entryPrice: lockedClosePrice,
        entrySource: EntrySource.CLOSING_PRICE,
        status: PickStatus.CONFIRMED,
      });
    } catch (err) {
      console.error('[submitMyPick Error]:', err);
      if (
        err instanceof NotFoundException ||
        err instanceof BadRequestException ||
        err instanceof ForbiddenException ||
        err instanceof ConflictException
      ) {
        throw err;
      }
      throw new BadRequestException(
        (err as any)?.message || 'Terjadi kesalahan saat memproses pick saham Anda.',
      );
    }
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
            isForceOpen: tourneyTimeInfo.isForceOpen ?? false,
            isPickWindowForceOpen: m.tournament.isPickWindowForceOpen ?? false,
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

