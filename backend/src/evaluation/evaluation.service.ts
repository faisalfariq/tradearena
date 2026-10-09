import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  EvaluationStatus,
  CandleAmbiguityPolicy,
  GapPolicy,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { TradeEvaluationEngine } from './engines/trade-evaluation.engine';
import { NormalizedCandle } from '../market-data/interfaces/market-data-provider.interface';
import { OverrideEvaluationDto } from './dto/override-evaluation.dto';

@Injectable()
export class EvaluationService {
  private readonly logger = new Logger(EvaluationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly engine: TradeEvaluationEngine,
  ) {}

  /**
   * Evaluates a single stock pick against intraday candles and persists results & evidence.
   */
  async evaluatePick(pickId: string) {
    const pick = await this.prisma.stockPick.findUnique({
      where: { id: pickId },
      include: {
        stock: true,
        participant: true,
        tournament: {
          include: { rules: true },
        },
      },
    });

    if (!pick) {
      throw new NotFoundException(
        `Stock pick dengan ID ${pickId} tidak ditemukan`,
      );
    }

    const rules = pick.tournament.rules;
    const initialStopPct = rules ? Number(rules.initialStopPct) : 0.03;
    const trailingStopPct = rules ? Number(rules.trailingStopPct) : 0.03;
    const candleAmbiguityPolicy = rules
      ? rules.candleAmbiguityPolicy
      : CandleAmbiguityPolicy.CONSERVATIVE_LOSS_FIRST;
    const gapPolicy = rules
      ? rules.gapPolicy
      : GapPolicy.ACTUAL_FIRST_VALID_LEVEL;
    const priceFractionPolicy = rules
      ? rules.priceFractionPolicy
      : 'IDX_STANDARD_V1';
    const calculationRuleVersion = rules
      ? rules.calculationRuleVersion
      : 'v1.0.0';

    // Fetch canonical 1-minute intraday candles
    const dbCandles = await this.prisma.intradayCandle.findMany({
      where: {
        symbol: pick.stock.symbol,
        tradingDate: pick.tradingDate,
      },
      orderBy: { timestamp: 'asc' },
    });

    const normalizedCandles: NormalizedCandle[] = dbCandles.map((c) => ({
      symbol: c.symbol,
      tradingDate: c.tradingDate.toISOString().substring(0, 10),
      timestamp: c.timestamp,
      open: Number(c.open),
      high: Number(c.high),
      low: Number(c.low),
      close: Number(c.close),
      volume: c.volume ? Number(c.volume) : 0,
      provider: c.provider,
    }));

    // Run deterministic evaluation engine
    const evalOutput = this.engine.evaluate({
      pickId: pick.id,
      symbol: pick.stock.symbol,
      entryPrice: Number(pick.entryPrice),
      entryTimestamp: pick.entryTimestamp || undefined,
      entrySource: pick.entrySource,
      initialStopPct,
      trailingStopPct,
      candleAmbiguityPolicy,
      gapPolicy,
      priceFractionPolicy,
      calculationRuleVersion,
      candles: normalizedCandles,
    });

    // Persist TradeEvaluation
    const evaluation = await this.prisma.tradeEvaluation.upsert({
      where: {
        pickId_calculationVersion: {
          pickId: pick.id,
          calculationVersion: evalOutput.calculationVersion,
        },
      },
      update: {
        status: evalOutput.status,
        entryPrice: evalOutput.entryPrice,
        exitPrice: evalOutput.exitPrice,
        exitTimestamp: evalOutput.exitTimestamp,
        exitReason: evalOutput.exitReason,
        highestPrice: evalOutput.highestPrice,
        maxFloatingReturn: evalOutput.maxFloatingReturn,
        theoreticalThreshold: evalOutput.theoreticalThreshold,
        actualExitPrice: evalOutput.actualExitPrice,
        realizedReturn: evalOutput.realizedReturn,
      },
      create: {
        pickId: pick.id,
        status: evalOutput.status,
        entryPrice: evalOutput.entryPrice,
        exitPrice: evalOutput.exitPrice,
        exitTimestamp: evalOutput.exitTimestamp,
        exitReason: evalOutput.exitReason,
        highestPrice: evalOutput.highestPrice,
        maxFloatingReturn: evalOutput.maxFloatingReturn,
        theoreticalThreshold: evalOutput.theoreticalThreshold,
        actualExitPrice: evalOutput.actualExitPrice,
        realizedReturn: evalOutput.realizedReturn,
        calculationVersion: evalOutput.calculationVersion,
      },
    });

    // Persist auditable Evidence
    await this.prisma.tradeEvaluationEvidence.upsert({
      where: { evaluationId: evaluation.id },
      update: {
        marketDataProvider: evalOutput.evidence.marketDataProvider,
        marketDataDate: pick.tradingDate,
        candleCount: evalOutput.evidence.candleCount,
        priceFractionVersion: evalOutput.evidence.priceFractionVersion,
        detailsJson: evalOutput.evidence as any,
      },
      create: {
        evaluationId: evaluation.id,
        marketDataProvider: evalOutput.evidence.marketDataProvider,
        marketDataDate: pick.tradingDate,
        candleCount: evalOutput.evidence.candleCount,
        priceFractionVersion: evalOutput.evidence.priceFractionVersion,
        detailsJson: evalOutput.evidence as any,
      },
    });

    // Create / update PointsResult
    await this.prisma.pointsResult.upsert({
      where: { evaluationId: evaluation.id },
      update: {
        points: evalOutput.realizedReturn,
        pointsRule: pick.tournament.rules?.pointsRule || 'PERCENTAGE_RETURN_V1',
        pointsRuleVersion: 'v1.0.0',
      },
      create: {
        evaluationId: evaluation.id,
        points: evalOutput.realizedReturn,
        pointsRule: pick.tournament.rules?.pointsRule || 'PERCENTAGE_RETURN_V1',
        pointsRuleVersion: 'v1.0.0',
      },
    });

    // Clean up any lingering override record since the evaluation was recomputed algorithmically by the engine
    await this.prisma.evaluationOverride.deleteMany({
      where: { evaluationId: evaluation.id },
    });

    this.logger.log(
      `[Evaluation] Pick ${pick.id} (${pick.stock.symbol}) evaluated: Exit ${evalOutput.exitPrice} (${evalOutput.exitReason}), Return: ${evalOutput.realizedReturn}%`,
    );

    return this.getEvaluationDetail(evaluation.id);
  }

  /**
   * Batch evaluates all stock picks for a tournament on a specified trading date.
   */
  async evaluateTournamentDay(tournamentId: string, tradingDateStr: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });

    if (!tournament) {
      throw new NotFoundException(
        `Turnamen dengan ID ${tournamentId} tidak ditemukan`,
      );
    }

    const targetDate = new Date(
      `${tradingDateStr.substring(0, 10)}T00:00:00.000Z`,
    );

    const picks = await this.prisma.stockPick.findMany({
      where: {
        tournamentId,
        tradingDate: targetDate,
      },
      include: {
        stock: true,
      },
    });

    if (picks.length === 0) {
      throw new BadRequestException(
        `Tidak ada stock pick yang terdaftar pada tanggal ${tradingDateStr} untuk turnamen ini`,
      );
    }

    const evaluations = [];
    for (const pick of picks) {
      try {
        const result = await this.evaluatePick(pick.id);
        evaluations.push(result);
      } catch (err) {
        this.logger.error(
          `Failed to evaluate pick ${pick.id} (${pick.stock.symbol}): ${(err as Error).message}`,
        );
      }
    }

    return {
      tournamentId,
      tradingDate: tradingDateStr.substring(0, 10),
      totalPicks: picks.length,
      evaluatedCount: evaluations.length,
      evaluations,
    };
  }

  /**
   * Retrieves all evaluations for a tournament, optionally filtered by trading date.
   */
  async getTournamentEvaluations(
    tournamentId: string,
    tradingDateStr?: string,
  ) {
    const whereClause: any = {
      pick: {
        tournamentId,
      },
    };

    if (tradingDateStr) {
      const targetDate = new Date(
        `${tradingDateStr.substring(0, 10)}T00:00:00.000Z`,
      );
      whereClause.pick.tradingDate = targetDate;
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
        evidence: true,
        pointsResult: true,
        override: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return evaluations.map((ev) => ({
      ...ev,
      override: ev.status === EvaluationStatus.OVERRIDDEN ? ev.override : null,
    }));
  }

  /**
   * Retrieves detailed evaluation record with full audit evidence.
   */
  async getEvaluationDetail(id: string) {
    const evaluation = await this.prisma.tradeEvaluation.findFirst({
      where: {
        OR: [{ id }, { pickId: id }],
      },
      include: {
        pick: {
          include: {
            participant: true,
            stock: true,
            tournament: {
              include: { rules: true },
            },
          },
        },
        evidence: true,
        pointsResult: true,
        override: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    if (!evaluation) {
      throw new NotFoundException(
        `Evaluasi trade dengan ID ${id} tidak ditemukan`,
      );
    }

    return {
      ...evaluation,
      override:
        evaluation.status === EvaluationStatus.OVERRIDDEN
          ? evaluation.override
          : null,
    };
  }

  /**
   * Manual override of an evaluation by Admin.
   * Preserves original results and stores reason and audit log.
   */
  async overrideEvaluation(
    evaluationId: string,
    dto: OverrideEvaluationDto,
    adminId: string,
  ) {
    const evaluation = await this.getEvaluationDetail(evaluationId);

    const entryPrice = Number(evaluation.entryPrice);
    const overrideExitPrice = Number(dto.overrideExitPrice);
    const overrideReturn =
      dto.overrideReturn !== undefined
        ? Number(dto.overrideReturn)
        : Number(
            (((overrideExitPrice - entryPrice) / entryPrice) * 100).toFixed(4),
          );
    const overridePoints =
      dto.overridePoints !== undefined
        ? Number(dto.overridePoints)
        : overrideReturn;

    // Create / update override log
    await this.prisma.evaluationOverride.upsert({
      where: { evaluationId },
      update: {
        userId: adminId,
        originalExitPrice: evaluation.exitPrice,
        originalReturn: evaluation.realizedReturn,
        originalPoints:
          evaluation.pointsResult?.points || evaluation.realizedReturn,
        overrideExitPrice,
        overrideReturn,
        overridePoints,
        reason: dto.reason,
      },
      create: {
        evaluationId,
        userId: adminId,
        originalExitPrice: evaluation.exitPrice,
        originalReturn: evaluation.realizedReturn,
        originalPoints:
          evaluation.pointsResult?.points || evaluation.realizedReturn,
        overrideExitPrice,
        overrideReturn,
        overridePoints,
        reason: dto.reason,
      },
    });

    // Update evaluation record status to OVERRIDDEN
    await this.prisma.tradeEvaluation.update({
      where: { id: evaluationId },
      data: {
        status: EvaluationStatus.OVERRIDDEN,
        exitPrice: overrideExitPrice,
        actualExitPrice: overrideExitPrice,
        realizedReturn: overrideReturn,
      },
    });

    // Update points
    await this.prisma.pointsResult.upsert({
      where: { evaluationId },
      update: {
        points: overridePoints,
      },
      create: {
        evaluationId,
        points: overridePoints,
        pointsRule: 'MANUAL_OVERRIDE',
        pointsRuleVersion: 'v1.0.0',
      },
    });

    // Create AuditLog
    await this.prisma.auditLog.create({
      data: {
        userId: adminId,
        action: 'EVALUATION_OVERRIDE',
        entityType: 'TRADE_EVALUATION',
        entityId: evaluationId,
        oldValues: {
          exitPrice: evaluation.exitPrice,
          realizedReturn: evaluation.realizedReturn,
        },
        newValues: {
          exitPrice: overrideExitPrice,
          realizedReturn: overrideReturn,
          reason: dto.reason,
        },
      },
    });

    this.logger.log(
      `[Evaluation] Evaluation ${evaluationId} overridden by Admin ${adminId}. Reason: ${dto.reason}`,
    );

    return this.getEvaluationDetail(evaluationId);
  }
}
