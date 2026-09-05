import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateParticipantDto } from './dto/create-participant.dto';
import { UpdateParticipantDto } from './dto/update-participant.dto';

@Injectable()
export class ParticipantsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateParticipantDto) {
    if (dto.email && dto.email.trim()) {
      const existing = await this.prisma.participant.findUnique({
        where: { email: dto.email.trim().toLowerCase() },
      });
      if (existing) {
        throw new ConflictException(
          `Peserta dengan email ${dto.email} sudah terdaftar`,
        );
      }
    }

    return this.prisma.participant.create({
      data: {
        name: dto.name.trim(),
        email: dto.email ? dto.email.trim().toLowerCase() : null,
        phoneNumber: dto.phoneNumber ? dto.phoneNumber.trim() : null,
      },
    });
  }

  async findAll(search?: string) {
    const where: any = {};
    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { name: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
      ];
    }

    return this.prisma.participant.findMany({
      where,
      orderBy: { name: 'asc' },
      include: {
        _count: {
          select: {
            tournaments: true,
            picks: true,
          },
        },
      },
    });
  }

  async findOne(id: string) {
    const participant = await this.prisma.participant.findUnique({
      where: { id },
      include: {
        tournaments: {
          include: {
            tournament: {
              select: {
                id: true,
                name: true,
                status: true,
                startDate: true,
                endDate: true,
              },
            },
          },
        },
        _count: {
          select: {
            tournaments: true,
            picks: true,
          },
        },
      },
    });

    if (!participant) {
      throw new NotFoundException(`Peserta dengan ID ${id} tidak ditemukan`);
    }

    return participant;
  }

  async update(id: string, dto: UpdateParticipantDto) {
    await this.findOne(id);

    if (dto.email && dto.email.trim()) {
      const email = dto.email.trim().toLowerCase();
      const existing = await this.prisma.participant.findUnique({
        where: { email },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          `Email ${email} sudah digunakan oleh peserta lain`,
        );
      }
    }

    return this.prisma.participant.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name.trim() }),
        ...(dto.email !== undefined && {
          email: dto.email ? dto.email.trim().toLowerCase() : null,
        }),
        ...(dto.phoneNumber !== undefined && {
          phoneNumber: dto.phoneNumber ? dto.phoneNumber.trim() : null,
        }),
      },
    });
  }

  async delete(id: string) {
    await this.findOne(id);
    return this.prisma.participant.delete({
      where: { id },
    });
  }

  async enroll(tournamentId: string, participantId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) {
      throw new NotFoundException(
        `Turnamen dengan ID ${tournamentId} tidak ditemukan`,
      );
    }

    const participant = await this.prisma.participant.findUnique({
      where: { id: participantId },
    });
    if (!participant) {
      throw new NotFoundException(
        `Peserta dengan ID ${participantId} tidak ditemukan`,
      );
    }

    const existingMembership =
      await this.prisma.tournamentParticipant.findUnique({
        where: {
          tournamentId_participantId: {
            tournamentId,
            participantId,
          },
        },
      });

    if (existingMembership) {
      throw new ConflictException(
        `Peserta '${participant.name}' sudah terdaftar dalam turnamen ini`,
      );
    }

    return this.prisma.tournamentParticipant.create({
      data: {
        tournamentId,
        participantId,
      },
      include: {
        participant: true,
      },
    });
  }

  async unenroll(tournamentId: string, participantId: string) {
    const existing = await this.prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_participantId: {
          tournamentId,
          participantId,
        },
      },
    });

    if (!existing) {
      throw new NotFoundException(`Peserta tidak terdaftar dalam turnamen ini`);
    }

    return this.prisma.tournamentParticipant.delete({
      where: {
        tournamentId_participantId: {
          tournamentId,
          participantId,
        },
      },
    });
  }

  async getTournamentParticipants(tournamentId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) {
      throw new NotFoundException(
        `Turnamen dengan ID ${tournamentId} tidak ditemukan`,
      );
    }

    const memberships = await this.prisma.tournamentParticipant.findMany({
      where: { tournamentId },
      orderBy: { joinedAt: 'asc' },
      include: {
        participant: {
          include: {
            _count: {
              select: {
                picks: {
                  where: { tournamentId },
                },
              },
            },
          },
        },
      },
    });

    return memberships.map((m) => ({
      membershipId: m.id,
      tournamentId: m.tournamentId,
      joinedAt: m.joinedAt,
      participant: m.participant,
      picksCount: m.participant._count.picks,
    }));
  }
}
