import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
import {
  CreateTournamentWithImportDto,
  ImportStandingItemDto,
} from './dto/import-standing.dto';
import {
  TournamentStatus,
  CandleAmbiguityPolicy,
  GapPolicy,
} from '@prisma/client';

@Injectable()
export class TournamentsService {
  constructor(private readonly prisma: PrismaService) {}

  private validateDates(startDateStr: string, endDateStr: string) {
    const start = new Date(startDateStr);
    const end = new Date(endDateStr);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      throw new BadRequestException(
        'Format tanggal mulai atau selesai tidak valid',
      );
    }

    if (end <= start) {
      throw new BadRequestException(
        'Tanggal selesai harus setelah tanggal mulai',
      );
    }
  }

  async create(dto: CreateTournamentDto) {
    this.validateDates(dto.startDate, dto.endDate);

    const initialStopPct = dto.rules?.initialStopPct ?? 0.03;
    const trailingStopPct = dto.rules?.trailingStopPct ?? 0.03;
    const noPickPenalty = dto.rules?.noPickPenalty ?? 10;
    const candleAmbiguityPolicy =
      dto.rules?.candleAmbiguityPolicy ??
      CandleAmbiguityPolicy.CONSERVATIVE_LOSS_FIRST;
    const gapPolicy =
      dto.rules?.gapPolicy ?? GapPolicy.ACTUAL_FIRST_VALID_LEVEL;
    const priceFractionPolicy =
      dto.rules?.priceFractionPolicy ?? 'IDX_STANDARD_V1';
    const pointsRule = dto.rules?.pointsRule ?? 'PERCENTAGE_RETURN_V1';
    const calculationRuleVersion =
      dto.rules?.calculationRuleVersion ?? 'v1.0.0';

    try {
      return await this.prisma.tournament.create({
        data: {
          name: dto.name,
          description: dto.description,
          startDate: new Date(dto.startDate),
          endDate: new Date(dto.endDate),
          timezone: dto.timezone || 'Asia/Jakarta',
          status: dto.status || TournamentStatus.UPCOMING,
          completionType: dto.completionType || 'DATE_PERIOD',
          targetPoints: dto.targetPoints ? Number(dto.targetPoints) : null,
          minPicksPerDay: dto.minPicksPerDay ?? 2,
          maxPicksPerDay: dto.maxPicksPerDay ?? 3,
          pickWindowStart: dto.pickWindowStart || '17:00',
          pickWindowEnd: dto.pickWindowEnd || '21:00',
          isPickWindowForceOpen: dto.isPickWindowForceOpen ?? false,
          rules: {
            create: {
              initialStopPct,
              trailingStopPct,
              noPickPenalty,
              candleAmbiguityPolicy,
              gapPolicy,
              priceFractionPolicy,
              pointsRule,
              calculationRuleVersion,
            },
          },
        },
        include: {
          rules: true,
        },
      });
    } catch (err: any) {
      console.error('[TournamentsService.create] Error creating tournament:', err);
      throw new BadRequestException(
        err.message || 'Gagal menyimpan data turnamen ke database',
      );
    }
  }

  async findAll(status?: TournamentStatus) {
    return this.prisma.tournament.findMany({
      where: status ? { status } : undefined,
      include: {
        rules: true,
        _count: {
          select: {
            participants: true,
            picks: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id },
      include: {
        rules: true,
        _count: {
          select: {
            participants: true,
            picks: true,
          },
        },
      },
    });

    if (!tournament) {
      throw new NotFoundException(`Turnamen dengan ID "${id}" tidak ditemukan`);
    }

    return tournament;
  }

  async update(id: string, dto: UpdateTournamentDto) {
    const existing = await this.findOne(id);

    const startDate = dto.startDate
      ? dto.startDate
      : existing.startDate.toISOString();
    const endDate = dto.endDate ? dto.endDate : existing.endDate.toISOString();
    this.validateDates(startDate, endDate);

    try {
      return await this.prisma.tournament.update({
        where: { id },
        data: {
          name: dto.name,
          description: dto.description,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: dto.endDate ? new Date(dto.endDate) : undefined,
          timezone: dto.timezone,
          status: dto.status,
          completionType: dto.completionType !== undefined ? dto.completionType : undefined,
          targetPoints:
            dto.targetPoints !== undefined
              ? dto.targetPoints
                ? Number(dto.targetPoints)
                : null
              : undefined,
          minPicksPerDay: dto.minPicksPerDay !== undefined ? dto.minPicksPerDay : undefined,
          maxPicksPerDay: dto.maxPicksPerDay !== undefined ? dto.maxPicksPerDay : undefined,
          pickWindowStart: dto.pickWindowStart !== undefined ? dto.pickWindowStart : undefined,
          pickWindowEnd: dto.pickWindowEnd !== undefined ? dto.pickWindowEnd : undefined,
          isPickWindowForceOpen:
            dto.isPickWindowForceOpen !== undefined
              ? dto.isPickWindowForceOpen
              : undefined,
          rules: dto.rules
            ? {
                upsert: {
                  create: {
                    initialStopPct: dto.rules.initialStopPct ?? 0.03,
                    trailingStopPct: dto.rules.trailingStopPct ?? 0.03,
                    noPickPenalty: dto.rules.noPickPenalty ?? 10,
                    candleAmbiguityPolicy:
                      dto.rules.candleAmbiguityPolicy ??
                      CandleAmbiguityPolicy.CONSERVATIVE_LOSS_FIRST,
                    gapPolicy:
                      dto.rules.gapPolicy ?? GapPolicy.ACTUAL_FIRST_VALID_LEVEL,
                    priceFractionPolicy:
                      dto.rules.priceFractionPolicy ?? 'IDX_STANDARD_V1',
                    pointsRule: dto.rules.pointsRule ?? 'PERCENTAGE_RETURN_V1',
                    calculationRuleVersion:
                      dto.rules.calculationRuleVersion ?? 'v1.0.0',
                  },
                  update: {
                    initialStopPct: dto.rules.initialStopPct,
                    trailingStopPct: dto.rules.trailingStopPct,
                    noPickPenalty: dto.rules.noPickPenalty,
                    candleAmbiguityPolicy: dto.rules.candleAmbiguityPolicy,
                    gapPolicy: dto.rules.gapPolicy,
                    priceFractionPolicy: dto.rules.priceFractionPolicy,
                    pointsRule: dto.rules.pointsRule,
                    calculationRuleVersion: dto.rules.calculationRuleVersion,
                  },
                },
              }
            : undefined,
        },
        include: {
          rules: true,
        },
      });
    } catch (err: any) {
      console.error('[TournamentsService.update] Error updating tournament:', err);
      throw new BadRequestException(
        err.message || 'Gagal memperbarui data turnamen',
      );
    }
  }

  async updateStatus(id: string, status: TournamentStatus) {
    await this.findOne(id);

    return this.prisma.tournament.update({
      where: { id },
      data: { status },
      include: {
        rules: true,
      },
    });
  }

  async togglePickWindow(id: string, forceOpen?: boolean) {
    const existing = await this.findOne(id);
    const newStatus =
      forceOpen !== undefined ? forceOpen : !existing.isPickWindowForceOpen;

    return this.prisma.tournament.update({
      where: { id },
      data: { isPickWindowForceOpen: newStatus },
      include: {
        rules: true,
        _count: {
          select: {
            participants: true,
            picks: true,
          },
        },
      },
    });
  }

  async remove(id: string) {
    const existing = await this.findOne(id);

    if (existing.status === TournamentStatus.ACTIVE) {
      throw new BadRequestException(
        'Turnamen yang sedang aktif tidak dapat dihapus',
      );
    }

    return this.prisma.tournament.delete({
      where: { id },
    });
  }

  async importStandingsToTournament(
    tournamentId: string,
    standings: ImportStandingItemDto[],
  ) {
    await this.findOne(tournamentId);

    const results = [];
    for (const item of standings) {
      const trimmedName = item.name?.trim();
      if (!trimmedName) continue;

      const trimmedEmail = item.email?.trim().toLowerCase() || null;

      // 1. Find existing participant by email or name
      let participant = await this.prisma.participant.findFirst({
        where: {
          OR: [
            ...(trimmedEmail
              ? [{ email: { equals: trimmedEmail, mode: 'insensitive' as const } }]
              : []),
            { name: { equals: trimmedName, mode: 'insensitive' as const } },
          ],
        },
      });

      // 2. If user exists with that email, link userId
      let user = null;
      if (trimmedEmail) {
        user = await this.prisma.user.findFirst({
          where: { email: { equals: trimmedEmail, mode: 'insensitive' as const } },
        });
      }

      if (!participant) {
        participant = await this.prisma.participant.create({
          data: {
            name: trimmedName,
            email: trimmedEmail,
            userId: user?.id || null,
          },
        });
      } else if (user && (!participant.userId || participant.userId !== user.id)) {
        try {
          await this.prisma.participant.update({
            where: { id: participant.id },
            data: { userId: user.id },
          });
        } catch {
          // ignore linking errors
        }
      }

      // Calculate initial picks count if not provided
      const winCount = Number(item.winCount ?? 0);
      const lossCount = Number(item.lossCount ?? 0);
      const breakevenCount = Number(item.breakevenCount ?? 0);
      const picksCount =
        item.picksCount !== undefined && item.picksCount !== null
          ? Number(item.picksCount)
          : winCount + lossCount + breakevenCount;
      const penaltiesCount = Number(item.penaltiesCount ?? 0);
      const penaltyPoints = Number(item.penaltyPoints ?? 0);
      const totalPoints = Number(item.totalPoints ?? 0);

      // 3. Upsert TournamentParticipant record
      const tp = await this.prisma.tournamentParticipant.upsert({
        where: {
          tournamentId_participantId: {
            tournamentId,
            participantId: participant.id,
          },
        },
        create: {
          tournamentId,
          participantId: participant.id,
          userId: participant.userId || user?.id || null,
          status: 'APPROVED',
          initialPoints: totalPoints,
          initialWinCount: winCount,
          initialLossCount: lossCount,
          initialBreakevenCount: breakevenCount,
          initialPicksCount: picksCount,
          initialPenaltiesCount: penaltiesCount,
          initialPenaltyPoints: penaltyPoints,
        },
        update: {
          initialPoints: totalPoints,
          initialWinCount: winCount,
          initialLossCount: lossCount,
          initialBreakevenCount: breakevenCount,
          initialPicksCount: picksCount,
          initialPenaltiesCount: penaltiesCount,
          initialPenaltyPoints: penaltyPoints,
          status: 'APPROVED',
        },
      });

      results.push({
        participantId: participant.id,
        participantName: participant.name,
        tournamentParticipantId: tp.id,
        initialPoints: totalPoints,
      });
    }

    return {
      tournamentId,
      importedCount: results.length,
      participants: results,
    };
  }

  async createWithImport(dto: CreateTournamentWithImportDto) {
    const tournament = await this.create(dto);
    if (dto.standings && Array.isArray(dto.standings) && dto.standings.length > 0) {
      const importResult = await this.importStandingsToTournament(
        tournament.id,
        dto.standings,
      );
      return {
        ...tournament,
        importedCount: importResult.importedCount,
      };
    }
    return tournament;
  }

  getImportTemplateCsv(): string {
    const headers =
      'nama_peserta,email,total_poin,win_count,loss_count,breakeven_count,total_trade,penalti_count,penalti_poin';
    const sampleRows = [
      'Budi Santoso,budi@example.com,25.40,8,2,1,11,0,0',
      'Siti Rahma,siti@example.com,18.75,6,3,0,9,1,-10',
      'Agus Trader,agus@example.com,12.20,5,4,2,11,0,0',
      'Dewi Lestari,,8.50,4,3,1,8,0,0',
      'Reza Pratama,reza@example.com,-3.50,2,5,1,8,1,-10',
    ];
    return [headers, ...sampleRows].join('\r\n');
  }
}
