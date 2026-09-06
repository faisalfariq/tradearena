import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  DashboardStatsResponse,
  TournamentSummaryItem,
  RecentEvaluationItem,
} from './interfaces/dashboard-stats.interface';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getDashboardStats(): Promise<DashboardStatsResponse> {
    const [
      activeTournamentsCount,
      totalTournamentsCount,
      totalParticipantsCount,
      totalPicksCount,
      completedEvaluationsCount,
      pendingReviewsCount,
      totalStocksCount,
      tournaments,
      recentEvaluationsRaw,
    ] = await Promise.all([
      this.prisma.tournament.count({
        where: { status: { in: ['ACTIVE', 'UPCOMING'] } },
      }),
      this.prisma.tournament.count(),
      this.prisma.participant.count(),
      this.prisma.stockPick.count(),
      this.prisma.tradeEvaluation.count({
        where: { status: 'COMPLETED' },
      }),
      this.prisma.tradeEvaluation.count({
        where: { status: { in: ['REVIEW_REQUIRED', 'PENDING_DATA'] } },
      }),
      this.prisma.stock.count({
        where: { isActive: true },
      }),
      this.prisma.tournament.findMany({
        take: 6,
        orderBy: { startDate: 'desc' },
        include: {
          _count: {
            select: {
              participants: true,
              picks: true,
            },
          },
        },
      }),
      this.prisma.tradeEvaluation.findMany({
        take: 8,
        orderBy: { createdAt: 'desc' },
        include: {
          pick: {
            include: {
              tournament: {
                select: { id: true, name: true },
              },
              participant: {
                select: { name: true },
              },
              stock: {
                select: { symbol: true },
              },
            },
          },
        },
      }),
    ]);

    const activeTournaments: TournamentSummaryItem[] = tournaments.map((t) => ({
      id: t.id,
      name: t.name,
      startDate: t.startDate.toISOString().split('T')[0],
      endDate: t.endDate.toISOString().split('T')[0],
      status: t.status,
      participantsCount: t._count.participants,
      picksCount: t._count.picks,
    }));

    const recentEvaluations: RecentEvaluationItem[] = recentEvaluationsRaw.map(
      (ev) => ({
        id: ev.id,
        tournamentId: ev.pick.tournament.id,
        tournamentName: ev.pick.tournament.name,
        participantName: ev.pick.participant.name,
        stockSymbol: ev.pick.stock.symbol,
        tradingDate: ev.pick.tradingDate.toISOString().split('T')[0],
        entryPrice: Number(ev.entryPrice),
        exitPrice: ev.exitPrice ? Number(ev.exitPrice) : null,
        realizedReturn: ev.realizedReturn ? Number(ev.realizedReturn) : null,
        exitReason: ev.exitReason,
        status: ev.status,
      }),
    );

    return {
      metrics: {
        activeTournamentsCount,
        totalTournamentsCount,
        totalParticipantsCount,
        totalPicksCount,
        completedEvaluationsCount,
        pendingReviewsCount,
        totalStocksCount,
      },
      activeTournaments,
      recentEvaluations,
    };
  }
}
