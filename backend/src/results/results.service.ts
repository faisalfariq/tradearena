import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PointsEngine } from './engines/points.engine';
import {
  DailyResultsResponse,
  DailyResultItem,
  DailySummaryMetrics,
  OverallResultsResponse,
  ParticipantOverallStats,
} from './interfaces/points.interface';
import { EvaluationStatus } from '@prisma/client';

@Injectable()
export class ResultsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pointsEngine: PointsEngine,
  ) {}

  /**
   * Retrieves daily results and leaderboard ranking for a tournament trading day.
   * Ranks are calculated dynamically using the 4-tier daily tie-breaker.
   */
  async getDailyResults(
    tournamentId: string,
    tradingDateStr?: string,
  ): Promise<DailyResultsResponse> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { rules: true },
    });

    if (!tournament) {
      throw new NotFoundException(
        `Turnamen dengan ID ${tournamentId} tidak ditemukan`,
      );
    }

    // Default to tournament startDate if no date provided
    const dateStr =
      tradingDateStr || tournament.startDate.toISOString().substring(0, 10);

    const targetDate = new Date(`${dateStr.substring(0, 10)}T00:00:00.000Z`);

    // Fetch all evaluations for the tournament and date
    const evaluations = await this.prisma.tradeEvaluation.findMany({
      where: {
        pick: {
          tournamentId,
          tradingDate: targetDate,
        },
      },
      include: {
        pick: {
          include: {
            participant: true,
            stock: true,
          },
        },
        override: true,
        pointsResult: true,
      },
    });

    const pointsRule = tournament.rules?.pointsRule || 'PERCENTAGE_RETURN_V1';
    const pointsRuleVersion =
      tournament.rules?.calculationRuleVersion || 'v1.0.0';

    // Step 1: Ensure pointsResult exists for each evaluation
    for (const ev of evaluations) {
      if (
        !ev.pointsResult &&
        (ev.status === EvaluationStatus.COMPLETED ||
          ev.status === EvaluationStatus.OVERRIDDEN)
      ) {
        const returnVal = Number(ev.realizedReturn ?? 0);
        const exitReason = ev.exitReason ?? 'MARKET_CLOSE';
        const overridePoints = ev.override?.overridePoints
          ? Number(ev.override.overridePoints)
          : ev.status === EvaluationStatus.OVERRIDDEN
            ? returnVal
            : null;

        const calc = this.pointsEngine.calculatePoints({
          evaluationId: ev.id,
          realizedReturn: returnVal,
          exitReason,
          pointsRule,
          pointsRuleVersion,
          overridePoints,
        });

        const createdPoints = await this.prisma.pointsResult.upsert({
          where: { evaluationId: ev.id },
          update: {
            points: calc.points,
            pointsRule: calc.pointsRule,
            pointsRuleVersion: calc.pointsRuleVersion,
          },
          create: {
            evaluationId: ev.id,
            points: calc.points,
            pointsRule: calc.pointsRule,
            pointsRuleVersion: calc.pointsRuleVersion,
          },
        });

        ev.pointsResult = createdPoints;
      }
    }

    // Step 2: Fetch any penalties for this trading date
    const penalties = await this.prisma.participantPenalty.findMany({
      where: {
        tournamentId,
        tradingDate: targetDate,
      },
      include: {
        participant: true,
      },
    });

    const penaltyItems: DailyResultItem[] = penalties.map((p) => ({
      rank: 0,
      participantId: p.participantId,
      participantName: p.participant.name,
      participantEmail: p.participant.email,
      pickId: `penalty-${p.id}`,
      stockSymbol: 'NO PICK',
      stockName: 'Tidak Pick Emiten',
      tradingDate: dateStr.substring(0, 10),
      entryPrice: 0,
      highestPrice: 0,
      maxFloatingReturn: 0,
      exitPrice: 0,
      exitTimestamp: p.createdAt,
      exitReason: 'PENALTY',
      realizedReturn: 0,
      points: Number(p.points),
      pointsRule: 'PENALTY',
      evaluationStatus: 'PENALTY',
      isOverridden: false,
      isPenalty: true,
      penaltyReason: p.reason,
    }));

    // Step 3: Format daily evaluated items
    const evaluatedItems: DailyResultItem[] = evaluations.map((ev) => {
      const realizedReturn = Number(ev.realizedReturn ?? 0);
      const points = ev.pointsResult
        ? Number(ev.pointsResult.points)
        : realizedReturn;

      return {
        rank: 0,
        participantId: ev.pick.participantId,
        participantName: ev.pick.participant.name,
        participantEmail: ev.pick.participant.email,
        pickId: ev.pickId,
        evaluationId: ev.id,
        stockSymbol: ev.pick.stock.symbol,
        stockName: ev.pick.stock.name,
        tradingDate: dateStr.substring(0, 10),
        entryPrice: Number(ev.entryPrice),
        highestPrice: Number(ev.highestPrice ?? ev.entryPrice),
        maxFloatingReturn: Number(ev.maxFloatingReturn ?? 0),
        exitPrice: Number(ev.exitPrice ?? 0),
        exitTimestamp: ev.exitTimestamp ?? new Date(),
        exitReason: ev.exitReason ?? 'PENDING',
        realizedReturn,
        points,
        pointsRule: ev.pointsResult?.pointsRule || pointsRule,
        evaluationStatus: ev.status,
        isOverridden: ev.status === EvaluationStatus.OVERRIDDEN,
        isPenalty: false,
      };
    });

    // Step 4: Sort all items using deterministic 4-tier Daily Tie-Breaker
    // 1. Points / Realized Return (descending)
    // 2. Max Floating Return (descending)
    // 3. Survival Time / Exit Timestamp (descending: later exit is better)
    // 4. Participant Name (alphabetical)
    const results = [...evaluatedItems, ...penaltyItems].sort((a, b) => {
      if (b.points !== a.points) {
        return b.points - a.points;
      }
      if (b.maxFloatingReturn !== a.maxFloatingReturn) {
        return b.maxFloatingReturn - a.maxFloatingReturn;
      }
      const timeA = new Date(a.exitTimestamp).getTime();
      const timeB = new Date(b.exitTimestamp).getTime();
      if (timeB !== timeA) {
        return timeB - timeA;
      }
      return a.participantName.localeCompare(b.participantName);
    });

    results.forEach((item, index) => {
      item.rank = index + 1;
    });

    // Step 5: Calculate Daily Summary Metrics
    const completedResults = results.filter(
      (r) =>
        r.evaluationStatus === EvaluationStatus.COMPLETED ||
        r.evaluationStatus === EvaluationStatus.OVERRIDDEN,
    );
    const totalParticipants = results.length;
    const averageReturn =
      completedResults.length > 0
        ? Number(
            (
              completedResults.reduce((acc, c) => acc + c.realizedReturn, 0) /
              completedResults.length
            ).toFixed(4),
          )
        : 0;

    const gainersCount = completedResults.filter(
      (r) => r.realizedReturn > 0,
    ).length;
    const losersCount =
      completedResults.filter((r) => r.realizedReturn < 0).length +
      penaltyItems.length;

    const topGainer =
      completedResults.length > 0
        ? {
            participantName: completedResults[0].participantName,
            stockSymbol: completedResults[0].stockSymbol,
            returnPct: completedResults[0].realizedReturn,
            points: completedResults[0].points,
          }
        : null;

    const topLoser =
      results.length > 0
        ? {
            participantName: results[results.length - 1].participantName,
            stockSymbol: results[results.length - 1].stockSymbol,
            returnPct: results[results.length - 1].realizedReturn,
            points: results[results.length - 1].points,
          }
        : null;

    const metrics: DailySummaryMetrics = {
      tradingDate: dateStr.substring(0, 10),
      totalParticipants,
      averageReturn,
      gainersCount,
      losersCount,
      topGainer,
      topLoser,
    };

    return {
      tournamentId,
      tradingDate: dateStr.substring(0, 10),
      metrics,
      results,
      penalties: penalties.map((p) => ({
        id: p.id,
        participantId: p.participantId,
        participantName: p.participant.name,
        points: Number(p.points),
        reason: p.reason,
      })),
    };
  }

  /**
   * Retrieves overall tournament leaderboard standings across all competition days.
   * Uses the authoritative 5-tier tournament standings tie-breaker.
   */
  async getOverallResults(
    tournamentId: string,
  ): Promise<OverallResultsResponse> {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: {
        participants: {
          include: { participant: true },
        },
        rules: true,
      },
    });

    if (!tournament) {
      throw new NotFoundException(
        `Turnamen dengan ID ${tournamentId} tidak ditemukan`,
      );
    }

    // Fetch all evaluations for the tournament
    const evaluations = await this.prisma.tradeEvaluation.findMany({
      where: {
        pick: { tournamentId },
      },
      include: {
        pick: {
          include: {
            participant: true,
            stock: true,
          },
        },
        pointsResult: true,
        override: true,
      },
      orderBy: {
        pick: {
          tradingDate: 'asc',
        },
      },
    });

    // Fetch all penalties for the tournament
    const allPenalties = await this.prisma.participantPenalty.findMany({
      where: { tournamentId },
      include: {
        participant: true,
      },
      orderBy: {
        tradingDate: 'asc',
      },
    });

    // Group evaluations by participantId
    const participantMap = new Map<string, any[]>();
    for (const p of tournament.participants) {
      participantMap.set(p.participantId, []);
    }

    for (const ev of evaluations) {
      const pid = ev.pick.participantId;
      if (!participantMap.has(pid)) {
        participantMap.set(pid, []);
      }
      participantMap.get(pid)!.push(ev);
    }

    // Compute stats for each participant
    const statsList: ParticipantOverallStats[] = [];

    for (const [participantId, evList] of participantMap.entries()) {
      const enrolledObj = tournament.participants.find(
        (tp) => tp.participantId === participantId,
      );
      const participantName =
        enrolledObj?.participant.name ||
        (evList.length > 0 ? evList[0].pick.participant.name : 'Unknown');
      const participantEmail = enrolledObj?.participant.email || null;

      const completed = evList.filter(
        (ev) =>
          ev.status === EvaluationStatus.COMPLETED ||
          ev.status === EvaluationStatus.OVERRIDDEN,
      );
      const picksCount = completed.length;

      let totalPoints = 0;
      let winCount = 0;
      let lossCount = 0;
      let breakevenCount = 0;
      let sumReturn = 0;

      let bestPick: ParticipantOverallStats['bestPick'] = null;
      let worstPick: ParticipantOverallStats['worstPick'] = null;

      const dailyHistory: ParticipantOverallStats['dailyHistory'] = [];

      for (const ev of completed) {
        const ret = Number(ev.realizedReturn ?? 0);
        const pts = ev.pointsResult ? Number(ev.pointsResult.points) : ret;

        totalPoints += pts;
        sumReturn += ret;

        if (ret > 0) winCount++;
        else if (ret < 0) lossCount++;
        else breakevenCount++;

        const dateStr = ev.pick.tradingDate.toISOString().substring(0, 10);
        dailyHistory.push({
          date: dateStr,
          symbol: ev.pick.stock.symbol,
          returnPct: ret,
          points: pts,
          dailyRank: 1, // dynamically computed
        });

        if (!bestPick || ret > bestPick.returnPct) {
          bestPick = {
            symbol: ev.pick.stock.symbol,
            date: dateStr,
            returnPct: ret,
            points: pts,
          };
        }

        if (!worstPick || ret < worstPick.returnPct) {
          worstPick = {
            symbol: ev.pick.stock.symbol,
            date: dateStr,
            returnPct: ret,
            points: pts,
          };
        }
      }

      // Add user penalties to total points and history
      const userPenalties = allPenalties.filter(
        (p) => p.participantId === participantId,
      );
      const penaltyPoints = userPenalties.reduce(
        (sum, p) => sum + Number(p.points),
        0,
      );
      const penaltiesCount = userPenalties.length;

      const penaltiesHistory = userPenalties.map((p) => ({
        id: p.id,
        date: p.tradingDate.toISOString().substring(0, 10),
        points: Number(p.points),
        reason: p.reason,
      }));

      for (const p of userPenalties) {
        const pDateStr = p.tradingDate.toISOString().substring(0, 10);
        dailyHistory.push({
          date: pDateStr,
          symbol: 'NO PICK (PENALTI)',
          returnPct: 0,
          points: Number(p.points),
          dailyRank: null,
          isPenalty: true,
          penaltyReason: p.reason,
        });
      }

      // Sort daily history chronologically
      dailyHistory.sort((a, b) => a.date.localeCompare(b.date));

      totalPoints += penaltyPoints;

      const winRate =
        picksCount > 0 ? Number(((winCount / picksCount) * 100).toFixed(2)) : 0;
      const averageReturn =
        picksCount > 0 ? Number((sumReturn / picksCount).toFixed(4)) : 0;

      statsList.push({
        rank: 0,
        participantId,
        participantName,
        participantEmail,
        totalPoints: Number(totalPoints.toFixed(4)),
        picksCount,
        winCount,
        lossCount,
        breakevenCount,
        winRate,
        averageReturn,
        penaltyPoints,
        penaltiesCount,
        penaltiesHistory,
        bestPick,
        worstPick,
        dailyHistory,
      });
    }

    // Step 6: Sort overall standings using 5-tier Overall Tie-Breaker
    // 1. Total Points (descending)
    // 2. Win Count (descending)
    // 3. Average Return (descending)
    // 4. Best Single Return (descending)
    // 5. Participant Name (alphabetical)
    statsList.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      if (b.winCount !== a.winCount) {
        return b.winCount - a.winCount;
      }
      if (b.averageReturn !== a.averageReturn) {
        return b.averageReturn - a.averageReturn;
      }
      const bestA = a.bestPick ? a.bestPick.returnPct : -999;
      const bestB = b.bestPick ? b.bestPick.returnPct : -999;
      if (bestB !== bestA) {
        return bestB - bestA;
      }
      return a.participantName.localeCompare(b.participantName);
    });

    // Assign overall ranks
    statsList.forEach((stat, index) => {
      stat.rank = index + 1;
    });

    // Check if tournament has TARGET_POINTS completion criteria and a participant reached target
    let targetReachedWinner: any = null;
    if (
      tournament.completionType === 'TARGET_POINTS' &&
      tournament.targetPoints &&
      tournament.status === 'ACTIVE'
    ) {
      const target = Number(tournament.targetPoints);
      const winner = statsList.find((s) => s.totalPoints >= target);
      if (winner) {
        targetReachedWinner = winner;
        await this.prisma.tournament.update({
          where: { id: tournamentId },
          data: {
            status: 'COMPLETED',
            winnerParticipantId: winner.participantId,
          },
        });
      }
    }

    return {
      tournamentId,
      tournamentName: tournament.name,
      tournamentStatus: targetReachedWinner ? 'COMPLETED' : tournament.status,
      completionType: tournament.completionType,
      targetPoints: tournament.targetPoints ? Number(tournament.targetPoints) : null,
      winnerParticipantId: targetReachedWinner ? targetReachedWinner.participantId : tournament.winnerParticipantId,
      winnerParticipantName: targetReachedWinner ? targetReachedWinner.participantName : null,
      totalParticipants: tournament.participants.length,
      totalEvaluatedPicks: evaluations.filter(
        (e) =>
          e.status === EvaluationStatus.COMPLETED ||
          e.status === EvaluationStatus.OVERRIDDEN,
      ).length,
      standings: statsList,
      totalPenaltiesCount: allPenalties.length,
    };
  }

  /**
   * Retrieves all penalty logs/history for a tournament.
   */
  async getTournamentPenalties(tournamentId: string) {
    const penalties = await this.prisma.participantPenalty.findMany({
      where: { tournamentId },
      include: {
        participant: true,
      },
      orderBy: {
        tradingDate: 'desc',
      },
    });

    return penalties.map((p) => ({
      id: p.id,
      participantId: p.participantId,
      participantName: p.participant.name,
      participantEmail: p.participant.email,
      tradingDate: p.tradingDate.toISOString().substring(0, 10),
      penaltyType: p.penaltyType,
      points: Number(p.points),
      reason: p.reason,
      createdAt: p.createdAt,
    }));
  }

  /**
   * Recalculates all PointsResult records for a tournament.
   * Useful when rules are updated or after bulk overrides.
   */
  async recalculateTournamentPoints(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
      include: { rules: true },
    });

    if (!tournament) {
      throw new NotFoundException(
        `Turnamen dengan ID ${tournamentId} tidak ditemukan`,
      );
    }

    const pointsRule = tournament.rules?.pointsRule || 'PERCENTAGE_RETURN_V1';
    const pointsRuleVersion =
      tournament.rules?.calculationRuleVersion || 'v1.0.0';

    const evaluations = await this.prisma.tradeEvaluation.findMany({
      where: {
        pick: { tournamentId },
        status: {
          in: [EvaluationStatus.COMPLETED, EvaluationStatus.OVERRIDDEN],
        },
      },
      include: {
        override: true,
      },
    });

    let recalculatedCount = 0;

    for (const ev of evaluations) {
      const returnVal = Number(ev.realizedReturn ?? 0);
      const exitReason = ev.exitReason ?? 'MARKET_CLOSE';
      const overridePoints =
        ev.status === EvaluationStatus.OVERRIDDEN && ev.override?.overridePoints
          ? Number(ev.override.overridePoints)
          : ev.status === EvaluationStatus.OVERRIDDEN
            ? returnVal
            : null;

      const calc = this.pointsEngine.calculatePoints({
        evaluationId: ev.id,
        realizedReturn: returnVal,
        exitReason,
        pointsRule,
        pointsRuleVersion,
        overridePoints,
      });

      await this.prisma.pointsResult.upsert({
        where: { evaluationId: ev.id },
        update: {
          points: calc.points,
          pointsRule: calc.pointsRule,
          pointsRuleVersion: calc.pointsRuleVersion,
        },
        create: {
          evaluationId: ev.id,
          points: calc.points,
          pointsRule: calc.pointsRule,
          pointsRuleVersion: calc.pointsRuleVersion,
        },
      });

      recalculatedCount++;
    }

    return {
      message: `Berhasil menghitung ulang poin untuk ${recalculatedCount} trade evaluation pada turnamen "${tournament.name}".`,
      tournamentId,
      recalculatedCount,
      pointsRule,
    };
  }
}
