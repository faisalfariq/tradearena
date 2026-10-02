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
      if (existingMembership.status === 'APPROVED') {
        throw new ConflictException(
          `Peserta '${participant.name}' sudah terdaftar aktif dalam turnamen ini`,
        );
      }
      return this.prisma.tournamentParticipant.update({
        where: { id: existingMembership.id },
        data: {
          status: 'APPROVED',
          joinedAt: new Date(),
        },
        include: {
          participant: true,
        },
      });
    }

    return this.prisma.tournamentParticipant.create({
      data: {
        tournamentId,
        participantId,
        status: 'APPROVED',
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

    await this.prisma.stockPick.deleteMany({
      where: {
        tournamentId,
        participantId,
      },
    });

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
      where: {
        tournamentId,
        status: { in: ['APPROVED', 'DISQUALIFIED'] },
      },
      orderBy: { joinedAt: 'asc' },
      include: {
        participant: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                name: true,
                role: true,
                avatarUrl: true,
              },
            },
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
      status: m.status,
      joinedAt: m.joinedAt,
      registeredAt: m.registeredAt,
      reviewedAt: m.reviewedAt,
      reviewedBy: m.reviewedBy,
      reviewNotes: m.reviewNotes,
      participant: m.participant,
      picksCount: m.participant._count.picks,
    }));
  }

  async applyToTournament(tournamentId: string, userId: string) {
    const tournament = await this.prisma.tournament.findUnique({
      where: { id: tournamentId },
    });
    if (!tournament) {
      throw new NotFoundException(
        `Turnamen dengan ID ${tournamentId} tidak ditemukan`,
      );
    }

    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new NotFoundException(`Pengguna tidak ditemukan`);
    }

    // Find or create participant for this user (case-insensitive email matching)
    let participant = await this.prisma.participant.findFirst({
      where: {
        OR: [
          { userId: user.id },
          ...(user.email ? [{ email: { equals: user.email.trim(), mode: 'insensitive' as const } }] : []),
        ],
      },
    });

    if (!participant) {
      const safeName = user.name?.trim() || user.email?.split('@')[0] || 'Peserta';
      try {
        participant = await this.prisma.participant.create({
          data: {
            name: safeName,
            email: user.email?.toLowerCase().trim() || null,
            userId: user.id,
          },
        });
      } catch {
        participant = await this.prisma.participant.findFirst({
          where: {
            OR: [
              { userId: user.id },
              ...(user.email ? [{ email: { equals: user.email.trim(), mode: 'insensitive' as const } }] : []),
            ],
          },
        });
      }
    } else if (!participant.userId || participant.userId !== user.id) {
      try {
        await this.prisma.participant.updateMany({
          where: { userId: user.id, id: { not: participant.id } },
          data: { userId: null },
        });
        participant = await this.prisma.participant.update({
          where: { id: participant.id },
          data: { userId: user.id },
        });
      } catch {
        // ignore
      }
    }

    if (!participant) {
      throw new NotFoundException('Gagal menyiapkan profil peserta');
    }

    // Check existing membership
    const existing = await this.prisma.tournamentParticipant.findFirst({
      where: {
        tournamentId,
        OR: [
          { participantId: participant.id },
          { userId: user.id },
        ],
      },
    });

    if (existing) {
      if (existing.status === 'APPROVED') {
        throw new ConflictException(
          'Anda sudah terdaftar sebagai peserta aktif di turnamen ini',
        );
      }
      if (existing.status === 'PENDING') {
        return {
          message: 'Pendaftaran Anda sedang menunggu persetujuan admin',
          status: 'PENDING',
          membership: existing,
        };
      }
      // If REJECTED, allow re-apply
      const updated = await this.prisma.tournamentParticipant.update({
        where: { id: existing.id },
        data: {
          status: 'PENDING',
          registeredAt: new Date(),
          reviewNotes: null,
          reviewedAt: null,
          reviewedBy: null,
        },
      });
      return {
        message: 'Permohonan pendaftaran ulang berhasil diajukan',
        status: 'PENDING',
        membership: updated,
      };
    }

    const created = await this.prisma.tournamentParticipant.create({
      data: {
        tournamentId,
        participantId: participant.id,
        userId: user.id,
        status: 'PENDING',
        registeredAt: new Date(),
      },
      include: {
        participant: true,
      },
    });

    return {
      message: 'Pendaftaran turnamen berhasil diajukan, menunggu persetujuan admin',
      status: 'PENDING',
      membership: created,
    };
  }

  async getMyTournamentStatus(tournamentId: string, userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      return { applied: false, status: null };
    }

    const participant = await this.prisma.participant.findFirst({
      where: {
        OR: [
          { userId: user.id },
          ...(user.email ? [{ email: { equals: user.email.trim(), mode: 'insensitive' as const } }] : []),
        ],
      },
    });

    const membership = await this.prisma.tournamentParticipant.findFirst({
      where: {
        tournamentId,
        OR: [
          ...(participant ? [{ participantId: participant.id }] : []),
          { userId: user.id },
        ],
      },
    });

    if (!membership) {
      return { applied: false, status: null };
    }

    return {
      applied: true,
      status: membership.status,
      membershipId: membership.id,
      participantId: membership.participantId,
      registeredAt: membership.registeredAt,
      reviewedAt: membership.reviewedAt,
      reviewNotes: membership.reviewNotes,
    };
  }

  async getApplicants(tournamentId: string, status?: any) {
    const where: any = { tournamentId };
    if (status) {
      where.status = status;
    }

    return this.prisma.tournamentParticipant.findMany({
      where,
      orderBy: { registeredAt: 'desc' },
      include: {
        participant: true,
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            provider: true,
            avatarUrl: true,
          },
        },
      },
    });
  }

  async reviewApplicant(
    tournamentId: string,
    participantId: string,
    status: 'APPROVED' | 'REJECTED' | 'DISQUALIFIED',
    adminUserId: string,
    reviewNotes?: string,
  ) {
    const membership = await this.prisma.tournamentParticipant.findUnique({
      where: {
        tournamentId_participantId: {
          tournamentId,
          participantId,
        },
      },
    });

    if (!membership) {
      throw new NotFoundException(
        `Pendaftaran peserta dengan ID ${participantId} tidak ditemukan di turnamen ini`,
      );
    }

    return this.prisma.tournamentParticipant.update({
      where: {
        tournamentId_participantId: {
          tournamentId,
          participantId,
        },
      },
      data: {
        status,
        reviewedAt: new Date(),
        reviewedBy: adminUserId,
        reviewNotes: reviewNotes || null,
        joinedAt: status === 'APPROVED' ? new Date() : membership.joinedAt,
      },
      include: {
        participant: true,
      },
    });
  }
}
