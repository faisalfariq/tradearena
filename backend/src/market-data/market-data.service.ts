import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  MarketDataProvider,
  MARKET_DATA_PROVIDER,
} from './interfaces/market-data-provider.interface';
import { YahooMarketDataProvider } from './providers/yahoo-market-data.provider';
import { MockMarketDataProvider } from './providers/mock-market-data.provider';
import { HttpMarketDataProvider } from './providers/http-market-data.provider';
import { TriggerSyncDto } from './dto/trigger-sync.dto';
import { SyncStatus } from '@prisma/client';

@Injectable()
export class MarketDataService implements OnModuleInit {
  private readonly logger = new Logger(MarketDataService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(MARKET_DATA_PROVIDER)
    private readonly defaultProvider: MarketDataProvider,
    private readonly yahooProvider: YahooMarketDataProvider,
    private readonly mockProvider: MockMarketDataProvider,
    private readonly httpProvider: HttpMarketDataProvider,
  ) {}

  async onModuleInit() {
    // Automatically sweep and recover any orphaned sync runs that were running when the server died/restarted
    try {
      await this.cleanupAllStaleSyncRuns();
    } catch (e: any) {
      this.logger.warn(`Failed initial cleanup of stale sync runs: ${e.message}`);
    }
  }

  /**
   * Sweeps all RUNNING runs and recovers them
   */
  async cleanupAllStaleSyncRuns(maxAgeMinutes: number = 0) {
    const threshold = new Date(Date.now() - maxAgeMinutes * 60 * 1000);
    const staleRuns = await this.prisma.marketSyncRun.findMany({
      where: {
        status: SyncStatus.RUNNING,
        startedAt: maxAgeMinutes > 0 ? { lte: threshold } : undefined,
      },
    });

    for (const run of staleRuns) {
      this.logger.log(`[MarketDataService] Auto-recovering stale sync run ${run.id}...`);
      await this.recoverStaleSyncRun(run.id, 'Proses terhenti karena restart server / timeout');
    }
  }

  /**
   * Recovers a stalled or interrupted sync run into a completed status (PARTIAL, SUCCESS, or FAILED)
   */
  async recoverStaleSyncRun(
    runId: string,
    reason: string = 'Proses sinkronisasi terputus akibat restart server atau batas waktu koneksi',
  ) {
    const run = await this.prisma.marketSyncRun.findUnique({
      where: { id: runId },
      include: { items: true },
    });
    if (!run) return null;

    // 1. Mark any item that is still RUNNING as FAILED
    await this.prisma.marketSyncItem.updateMany({
      where: {
        syncRunId: runId,
        status: SyncStatus.RUNNING,
      },
      data: {
        status: SyncStatus.FAILED,
        errorMessage: reason,
      },
    });

    // 2. Fetch fresh items to accurately count results
    const items = await this.prisma.marketSyncItem.findMany({
      where: { syncRunId: runId },
    });

    const successCount = items.filter((i) => i.status === SyncStatus.SUCCESS).length;
    const failedCount = items.filter((i) => i.status === SyncStatus.FAILED).length;

    const finalStatus =
      successCount === run.totalSymbols && run.totalSymbols > 0
        ? SyncStatus.SUCCESS
        : successCount > 0
          ? SyncStatus.PARTIAL
          : SyncStatus.FAILED;

    return this.prisma.marketSyncRun.update({
      where: { id: runId },
      data: {
        status: finalStatus,
        syncedCount: successCount,
        failedCount,
        completedAt: new Date(),
        errorMessage:
          failedCount > 0
            ? `${failedCount} dari ${run.totalSymbols} simbol tidak tuntas: ${reason}`
            : null,
      },
      include: {
        items: true,
      },
    });
  }

  /**
   * Allows an admin to manually cancel / reset a stuck sync run
   */
  async cancelSyncRun(runId: string) {
    return this.recoverStaleSyncRun(runId, 'Dibatalkan secara manual oleh Admin');
  }

  /**
   * Triggers historical intraday sync for all unique stocks picked in a tournament on a given date.
   * Ensures data is fetched once per unique symbol/date (PRD Section 13).
   */
  async triggerSync(tournamentId: string, dto: TriggerSyncDto) {
    // 1. Verify tournament exists
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) {
      throw new NotFoundException(
        `Turnamen dengan ID ${tournamentId} tidak ditemukan`,
      );
    }

    const dateStr = dto.tradingDate.substring(0, 10);
    const tradingDateObj = new Date(`${dateStr}T00:00:00.000Z`);

    // Verify date is within tournament duration
    const startStr = tournament.startDate.toISOString().substring(0, 10);
    const endStr = tournament.endDate.toISOString().substring(0, 10);
    if (dateStr < startStr || dateStr > endStr) {
      throw new BadRequestException(
        `Tanggal perdagangan (${dateStr}) berada di luar periode turnamen (${startStr} s/d ${endStr})`,
      );
    }

    // 2. Collect eligible picks for this tournament and date
    const picks = await this.prisma.stockPick.findMany({
      where: {
        tournamentId,
        tradingDate: tradingDateObj,
      },
      include: { stock: true },
    });

    if (picks.length === 0) {
      throw new BadRequestException(
        `Tidak ada stock pick yang terdaftar pada tanggal ${dateStr} untuk turnamen ini`,
      );
    }

    // 3. Resolve UNIQUE symbols strategy (PRD Section 13)
    const uniqueStocksMap = new Map<
      string,
      { id: string; symbol: string; name: string }
    >();
    for (const p of picks) {
      if (p.stock && p.stock.isActive) {
        uniqueStocksMap.set(p.stock.symbol, p.stock);
      }
    }

    const uniqueSymbols = Array.from(uniqueStocksMap.keys());
    this.logger.log(
      `[MarketSync] Found ${picks.length} picks with ${uniqueSymbols.length} unique symbols: [${uniqueSymbols.join(
        ', ',
      )}]`,
    );

    // 4. Create MarketSyncRun tracking record
    const syncRun = await this.prisma.marketSyncRun.create({
      data: {
        tournamentId,
        tradingDate: tradingDateObj,
        status: SyncStatus.RUNNING,
        totalSymbols: uniqueSymbols.length,
        syncedCount: 0,
        failedCount: 0,
        startedAt: new Date(),
      },
    });

    const providerKey = (dto.provider || '').toLowerCase();
    const chosenProvider: MarketDataProvider =
      providerKey === 'yahoo' || providerKey === 'yahoo_finance'
        ? this.yahooProvider
        : providerKey === 'mock'
        ? this.mockProvider
        : providerKey === 'http'
        ? this.httpProvider
        : this.defaultProvider;

    this.logger.log(
      `[MarketSync] Selected provider '${chosenProvider.providerName}' for date ${dateStr}`,
    );

    let syncedCount = 0;
    let failedCount = 0;

    // 5. Fetch and persist candles for each unique symbol once
    for (const symbol of uniqueSymbols) {
      const stock = uniqueStocksMap.get(symbol)!;

      // Upsert initial item state
      const item = await this.prisma.marketSyncItem.upsert({
        where: {
          syncRunId_symbol: {
            syncRunId: syncRun.id,
            symbol,
          },
        },
        update: {
          status: SyncStatus.RUNNING,
          errorMessage: null,
        },
        create: {
          syncRunId: syncRun.id,
          symbol,
          status: SyncStatus.RUNNING,
        },
      });

      try {
        // Fetch canonical normalized candles from provider
        const normalizedCandles = await chosenProvider.getIntradayCandles({
          symbol,
          tradingDate: dateStr,
          interval: '1m',
        });

        if (normalizedCandles.length === 0) {
          throw new Error(
            `Provider '${chosenProvider.providerName}' tidak mengembalikan candle untuk ${symbol}`,
          );
        }

        // Clean up any previous candles for this symbol & date to guarantee fresh canonical data
        await this.prisma.intradayCandle.deleteMany({
          where: {
            symbol: stock.symbol,
            tradingDate: tradingDateObj,
          },
        });

        // Batch persist candles into database
        // In PostgreSQL with Prisma, createMany with skipDuplicates ensures idempotency
        await this.prisma.intradayCandle.createMany({
          data: normalizedCandles.map((c) => ({
            stockId: stock.id,
            symbol: c.symbol,
            tradingDate: tradingDateObj,
            timestamp: c.timestamp,
            open: c.open,
            high: c.high,
            low: c.low,
            close: c.close,
            volume: c.volume !== undefined ? BigInt(c.volume) : null,
            provider: c.provider,
          })),
          skipDuplicates: true,
        });

        // Update item as SUCCESS
        await this.prisma.marketSyncItem.update({
          where: { id: item.id },
          data: {
            status: SyncStatus.SUCCESS,
            candlesCount: normalizedCandles.length,
          },
        });

        syncedCount++;
        // Update live parent run counts incrementally
        await this.prisma.marketSyncRun.update({
          where: { id: syncRun.id },
          data: { syncedCount, failedCount },
        });
      } catch (err: any) {
        this.logger.error(
          `[MarketSync] Failed syncing symbol ${symbol}: ${err.message}`,
        );
        failedCount++;

        await this.prisma.marketSyncItem.update({
          where: { id: item.id },
          data: {
            status: SyncStatus.FAILED,
            errorMessage: err.message || 'Unknown provider error',
          },
        });

        // Update live parent run counts incrementally
        await this.prisma.marketSyncRun.update({
          where: { id: syncRun.id },
          data: { syncedCount, failedCount },
        });
      }
    }

    // 6. Finalize sync run record
    const finalStatus =
      failedCount === 0
        ? SyncStatus.SUCCESS
        : syncedCount > 0
          ? SyncStatus.PARTIAL
          : SyncStatus.FAILED;

    const completedRun = await this.prisma.marketSyncRun.update({
      where: { id: syncRun.id },
      data: {
        status: finalStatus,
        syncedCount,
        failedCount,
        completedAt: new Date(),
        errorMessage:
          failedCount > 0
            ? `${failedCount} dari ${uniqueSymbols.length} simbol gagal disinkronkan`
            : null,
      },
      include: {
        items: true,
      },
    });

    return completedRun;
  }

  /**
   * Retrieves all sync runs for a tournament.
   */
  async getSyncRuns(tournamentId: string) {
    // Automatically sweep any stale RUNNING runs for this tournament (older than 3 minutes)
    try {
      const staleThreshold = new Date(Date.now() - 3 * 60 * 1000);
      const staleRuns = await this.prisma.marketSyncRun.findMany({
        where: {
          tournamentId,
          status: SyncStatus.RUNNING,
          startedAt: { lte: staleThreshold },
        },
      });
      for (const r of staleRuns) {
        await this.recoverStaleSyncRun(r.id);
      }
    } catch (e: any) {
      this.logger.warn(`Notice while recovering stale sync runs: ${e.message}`);
    }

    return this.prisma.marketSyncRun.findMany({
      where: { tournamentId },
      orderBy: { createdAt: 'desc' },
      include: {
        items: true,
      },
    });
  }

  /**
   * Retrieves details of a specific sync run.
   */
  async getSyncRunDetail(runId: string) {
    let run = await this.prisma.marketSyncRun.findUnique({
      where: { id: runId },
      include: {
        items: true,
        tournament: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!run) {
      throw new NotFoundException(
        `Sync run dengan ID ${runId} tidak ditemukan`,
      );
    }

    // If still marked as RUNNING but started more than 3 minutes ago, auto-recover it
    if (
      run.status === SyncStatus.RUNNING &&
      run.startedAt &&
      run.startedAt.getTime() < Date.now() - 3 * 60 * 1000
    ) {
      const recovered = await this.recoverStaleSyncRun(runId);
      if (recovered) {
        run = recovered as any;
      }
    }

    return run;
  }

  /**
   * Retrieves stored intraday candles for a specific symbol and date.
   */
  async getCandles(symbol: string, tradingDate: string, limit: number = 1000) {
    const cleanSymbol = symbol.trim().toUpperCase();
    const dateStr = tradingDate.substring(0, 10);
    const tradingDateObj = new Date(`${dateStr}T00:00:00.000Z`);

    const candles = await this.prisma.intradayCandle.findMany({
      where: {
        symbol: cleanSymbol,
        tradingDate: tradingDateObj,
      },
      orderBy: { timestamp: 'asc' },
      take: limit,
    });

    // Convert BigInt volume to string for JSON serialization
    return candles.map((c) => ({
      ...c,
      volume: c.volume !== null ? c.volume.toString() : null,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
    }));
  }
}
