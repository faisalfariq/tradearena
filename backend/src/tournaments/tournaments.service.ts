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

    return this.prisma.tournament.create({
      data: {
        name: dto.name,
        description: dto.description,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        timezone: dto.timezone || 'Asia/Jakarta',
        status: dto.status || TournamentStatus.UPCOMING,
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

    return this.prisma.tournament.update({
      where: { id },
      data: {
        name: dto.name,
        description: dto.description,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
        timezone: dto.timezone,
        status: dto.status,
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
