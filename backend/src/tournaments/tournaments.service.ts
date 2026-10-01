import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTournamentDto } from './dto/create-tournament.dto';
import { UpdateTournamentDto } from './dto/update-tournament.dto';
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
          rules: {
            create: {
              initialStopPct,
              trailingStopPct,
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
          rules: dto.rules
            ? {
                upsert: {
                  create: {
                    initialStopPct: dto.rules.initialStopPct ?? 0.03,
                    trailingStopPct: dto.rules.trailingStopPct ?? 0.03,
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
}
