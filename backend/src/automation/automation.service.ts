import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MarketDataService } from '../market-data/market-data.service';
import { EvaluationService } from '../evaluation/evaluation.service';
import { ResultsService } from '../results/results.service';
import {
  PipelineExecutionReport,
  PipelineStepResult,
  ExceptionsSummaryResponse,
  ExceptionItem,
} from './interfaces/automation.interface';

@Injectable()
export class AutomationService {
  private readonly logger = new Logger(AutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly marketDataService: MarketDataService,
    private readonly evaluationService: EvaluationService,
    private readonly resultsService: ResultsService,
  ) {}

  /**
   * Run the complete daily post-market pipeline for a tournament:
   * 1. Collect picks & resolve unique symbols
   * 2. Trigger market data sync (historical intraday 1m candles)
   * 3. Run deterministic evaluation engine on all picks
   * 4. Calculate tournament points & update standings
   * 5. Record immutable audit log
   */
  async runDailyPipeline(
    tournamentId: string,
    tradingDateStr?: string,
    adminId?: string,
  ): Promise<PipelineExecutionReport> {
    const startedAt = new Date();
    const steps: PipelineStepResult[] = [];

    // 1. Verify tournament exists
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { rules: true },
    });

    if (!tournament) {
      throw new NotFoundException(
        `Tournament with ID "${tournamentId}" not found`,
      );
    }

    const dateStr =
      tradingDateStr || tournament.startDate.toISOString().split('T')[0];
    this.logger.log(
      `Starting post-market daily pipeline for "${tournament.name}" on date ${dateStr}`,
    );

    // Step 1: Collect Picks & Unique Symbols
    let picksCount = 0;
    let uniqueSymbolsCount = 0;
    try {
      const picks = await this.prisma.stockPick.findMany({
        where: {
          tournamentId,
          tradingDate: new Date(dateStr),
          status: 'CONFIRMED',
        },
        include: { stock: true },
      });

      picksCount = picks.length;
      const uniqueSymbols = Array.from(
        new Set(picks.map((p) => p.stock.symbol)),
      );
      uniqueSymbolsCount = uniqueSymbols.length;

      steps.push({
        step: 'COLLECT_PICKS',
        status: 'SUCCESS',
        message: `Ditemukan ${picksCount} stock pick terkonfirmasi mencakup ${uniqueSymbolsCount} emiten unik (${uniqueSymbols.join(', ') || 'tidak ada'}).`,
        details: { picksCount, uniqueSymbols },
      });
    } catch (err: any) {
      this.logger.error(`Error in COLLECT_PICKS step: ${err.message}`);
      steps.push({
        step: 'COLLECT_PICKS',
        status: 'FAILED',
        message: `Gagal mengumpulkan stock pick: ${err.message}`,
      });
    }

    // Step 2: Market Data Sync
    let syncSuccess = false;
    if (uniqueSymbolsCount > 0) {
      try {
        const syncRun = await this.marketDataService.triggerSync(tournamentId, {
          tradingDate: dateStr,
        });
        syncSuccess =
          syncRun.status === 'SUCCESS' || syncRun.status === 'PARTIAL';

        steps.push({
          step: 'MARKET_DATA_SYNC',
          status: syncSuccess ? 'SUCCESS' : 'WARNING',
          message: `Sinkronisasi data intraday selesai dengan status ${syncRun.status}. Disinkronkan: ${syncRun.syncedCount}/${syncRun.totalSymbols} emiten.`,
          details: {
            syncRunId: syncRun.id,
            status: syncRun.status,
            syncedCount: syncRun.syncedCount,
            totalSymbols: syncRun.totalSymbols,
          },
        });
      } catch (err: any) {
        this.logger.error(`Error in MARKET_DATA_SYNC step: ${err.message}`);
        steps.push({
          step: 'MARKET_DATA_SYNC',
          status: 'WARNING',
          message: `Sinkronisasi data bursa mengalami kendala: ${err.message}. Mengevaluasi dengan data tersedia.`,
        });
      }
    } else {
      steps.push({
        step: 'MARKET_DATA_SYNC',
        status: 'SKIPPED',
        message:
          'Tidak ada emiten unik yang perlu disinkronkan untuk tanggal ini.',
      });
    }

    // Step 3: Run Deterministic Trade Evaluation
    let evaluatedCount = 0;
    let completedCount = 0;
    let exceptionsCount = 0;
    if (picksCount > 0) {
      try {
        const evalResult = await this.evaluationService.evaluateTournamentDay(
          tournamentId,
          dateStr,
        );

        evaluatedCount = evalResult.evaluatedCount;

        // Count completed vs exception states in evaluations
        const evals = await this.prisma.tradeEvaluation.findMany({
          where: {
            pick: {
              tournamentId,
              tradingDate: new Date(dateStr),
            },
          },
        });

        completedCount = evals.filter(
          (e) => e.status === 'COMPLETED' || e.status === 'OVERRIDDEN',
        ).length;
        exceptionsCount = evals.filter(
          (e) => e.status === 'REVIEW_REQUIRED' || e.status === 'PENDING_DATA',
        ).length;

        steps.push({
          step: 'DETERMINISTIC_EVALUATION',
          status: exceptionsCount > 0 ? 'WARNING' : 'SUCCESS',
          message: `Evaluasi trade selesai: ${completedCount} sukses (COMPLETED), ${exceptionsCount} perlu ditinjau (REVIEW_REQUIRED / PENDING_DATA).`,
          details: { evaluatedCount, completedCount, exceptionsCount },
        });
      } catch (err: any) {
        this.logger.error(
          `Error in DETERMINISTIC_EVALUATION step: ${err.message}`,
        );
        steps.push({
          step: 'DETERMINISTIC_EVALUATION',
          status: 'FAILED',
          message: `Evaluasi deterministik gagal: ${err.message}`,
        });
      }
    } else {
      steps.push({
        step: 'DETERMINISTIC_EVALUATION',
        status: 'SKIPPED',
        message: `Tidak ada stock pick untuk dievaluasi pada tanggal ${dateStr}.`,
      });
    }

    // Step 4: Calculate Tournament Points & Leaderboard
    let recalculatedPointsCount = 0;
    try {
      const pointsResult =
        await this.resultsService.recalculateTournamentPoints(tournamentId);
      recalculatedPointsCount = pointsResult.recalculatedCount;

      steps.push({
        step: 'POINTS_CALCULATION',
        status: 'SUCCESS',
        message: `Kalkulasi poin turnamen berhasil untuk ${recalculatedPointsCount} evaluasi trade selesai. Klasemen resmi diperbarui.`,
        details: { recalculatedPointsCount },
      });
    } catch (err: any) {
      this.logger.error(`Error in POINTS_CALCULATION step: ${err.message}`);
      steps.push({
        step: 'POINTS_CALCULATION',
        status: 'FAILED',
        message: `Kalkulasi poin turnamen gagal: ${err.message}`,
      });
    }

    const completedAt = new Date();
    const hasFailedStep = steps.some((s) => s.status === 'FAILED');
    const hasWarningStep = steps.some((s) => s.status === 'WARNING');
    const overallStatus: 'SUCCESS' | 'PARTIAL' | 'FAILED' = hasFailedStep
      ? 'FAILED'
      : hasWarningStep
        ? 'PARTIAL'
        : 'SUCCESS';

    const pipelineId = `pipeline-${Date.now()}`;

    // Step 5: Save Permanent Audit Log
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: adminId || null,
          action: 'DAILY_POST_MARKET_PIPELINE',
          entityType: 'Tournament',
          entityId: tournamentId,
          newValues: {
            pipelineId,
            dateStr,
            overallStatus,
            picksCount,
            uniqueSymbolsCount,
            evaluatedCount,
            completedCount,
            exceptionsCount,
            recalculatedPointsCount,
          },
        },
      });
    } catch (auditErr: any) {
      this.logger.warn(`Could not save audit log: ${auditErr.message}`);
    }

    return {
      pipelineId,
      tournamentId,
      tournamentName: tournament.name,
      tradingDate: dateStr,
      startedAt: startedAt.toISOString(),
      completedAt: completedAt.toISOString(),
      overallStatus,
      uniqueSymbolsCount,
      picksCount,
      evaluatedCount,
      completedCount,
      exceptionsCount,
      recalculatedPointsCount,
      steps,
    };
  }

  /**
   * Get all exceptions (REVIEW_REQUIRED or PENDING_DATA) for a tournament
   */
  async getExceptions(
    tournamentId: string,
    tradingDateStr?: string,
  ): Promise<ExceptionsSummaryResponse> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(
        `Tournament with ID "${tournamentId}" not found`,
      );
    }

    const whereClause: any = {
      pick: {
        tournamentId,
      },
      status: {
        in: ['REVIEW_REQUIRED', 'PENDING_DATA'],
      },
    };

    if (tradingDateStr) {
      whereClause.pick.tradingDate = new Date(tradingDateStr);
    }

    const evaluations = await this.prisma.tradeEvaluation.findMany({
      where: whereClause,
      include: {
        pick: {
          include: {
            participant: true,
            stock: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const items: ExceptionItem[] = evaluations.map((ev) => ({
      id: ev.id,
      pickId: ev.pickId,
      participantId: ev.pick.participantId,
      participantName: ev.pick.participant.name,
      stockSymbol: ev.pick.stock.symbol,
      tradingDate: ev.pick.tradingDate.toISOString().split('T')[0],
      status: ev.status as 'PENDING_DATA' | 'REVIEW_REQUIRED',
      entryPrice: Number(ev.entryPrice),
      exitPrice: ev.exitPrice ? Number(ev.exitPrice) : null,
      realizedReturn: ev.realizedReturn ? Number(ev.realizedReturn) : null,
      exitReason: ev.exitReason,
      notes:
        ev.status === 'PENDING_DATA'
          ? 'Data intraday candle belum tersedia atau belum lengkap.'
          : 'Memerlukan review manual admin karena anomali harga atau suspensi emiten.',
      createdAt: ev.createdAt.toISOString(),
    }));

    const pendingDataCount = items.filter(
      (i) => i.status === 'PENDING_DATA',
    ).length;
    const reviewRequiredCount = items.filter(
      (i) => i.status === 'REVIEW_REQUIRED',
    ).length;

    return {
      tournamentId,
      tournamentName: tournament.name,
      tradingDate: tradingDateStr,
      totalExceptions: items.length,
      pendingDataCount,
      reviewRequiredCount,
      items,
    };
  }

  /**
   * Retry evaluation for a specific pick
   */
  async retryEvaluation(evaluationId: string, adminId?: string): Promise<any> {
    const evaluation = await this.prisma.tradeEvaluation.findUnique({
      where: { id: evaluationId },
      include: {
        pick: {
          include: {
            tournament: true,
            stock: true,
          },
        },
      },
    });

    if (!evaluation) {
      throw new NotFoundException(
        `Evaluation with ID "${evaluationId}" not found`,
      );
    }

    const { pick } = evaluation;
    const dateStr = pick.tradingDate.toISOString().split('T')[0];

    this.logger.log(
      `Retrying evaluation ${evaluationId} for ${pick.stock.symbol} on ${dateStr}`,
    );

    // 1. Re-sync data for this specific stock
    await this.marketDataService.triggerSync(pick.tournamentId, {
      tradingDate: dateStr,
    });

    // 2. Re-run evaluation
    const result = await this.evaluationService.evaluatePick(pick.id);

    // 3. Recalculate points if completed
    if (result.status === 'COMPLETED') {
      await this.resultsService.recalculateTournamentPoints(pick.tournamentId);
    }

    // 4. Log audit trail
    try {
      await this.prisma.auditLog.create({
        data: {
          userId: adminId || null,
          action: 'RETRY_TRADE_EVALUATION',
          entityType: 'TradeEvaluation',
          entityId: evaluationId,
          newValues: {
            previousStatus: evaluation.status,
            newStatus: result.status,
            realizedReturn: result.realizedReturn,
            exitReason: result.exitReason,
          },
        },
      });
    } catch (e: any) {
      this.logger.warn(`Could not save retry audit log: ${e.message}`);
    }

    return {
      message: `Evaluasi untuk ${pick.stock.symbol} berhasil dicoba ulang.`,
      previousStatus: evaluation.status,
      newStatus: result.status,
      result,
    };
  }
}
