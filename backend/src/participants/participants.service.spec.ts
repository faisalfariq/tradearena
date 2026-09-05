import { Test, TestingModule } from '@nestjs/testing';
import { ParticipantsService } from './participants.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('ParticipantsService', () => {
  let service: ParticipantsService;
  let prismaService: any;

  const mockParticipant = {
    id: 'participant-uuid-1',
    name: 'Budi Santoso',
    email: 'budi@bsjp.local',
    phoneNumber: '08123456789',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockTournament = {
    id: 'tournament-uuid-1',
    name: 'BSJP Tournament',
    startDate: new Date('2026-10-01'),
    endDate: new Date('2026-10-31'),
  };

  const mockMembership = {
    id: 'membership-uuid-1',
    tournamentId: mockTournament.id,
    participantId: mockParticipant.id,
    joinedAt: new Date(),
    participant: mockParticipant,
  };

  beforeEach(async () => {
    prismaService = {
      participant: {
        create: jest.fn().mockResolvedValue(mockParticipant),
        findMany: jest.fn().mockResolvedValue([mockParticipant]),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (
            where.id === mockParticipant.id ||
            where.email === mockParticipant.email
          ) {
            return mockParticipant;
          }
          return null;
        }),
        update: jest.fn().mockImplementation(({ data }) => ({
          ...mockParticipant,
          ...data,
        })),
        delete: jest.fn().mockResolvedValue(mockParticipant),
      },
      tournament: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === mockTournament.id) return mockTournament;
          return null;
        }),
      },
      tournamentParticipant: {
        create: jest.fn().mockResolvedValue(mockMembership),
        findUnique: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([
          {
            ...mockMembership,
            participant: {
              ...mockParticipant,
              _count: { picks: 2 },
            },
          },
        ]),
        delete: jest.fn().mockResolvedValue(mockMembership),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ParticipantsService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<ParticipantsService>(ParticipantsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a participant when email is unique', async () => {
      prismaService.participant.findUnique.mockResolvedValueOnce(null);

      const result = await service.create({
        name: 'Siti Rahma',
        email: 'siti@bsjp.local',
      });

      expect(result).toBeDefined();
      expect(prismaService.participant.create).toHaveBeenCalled();
    });

    it('should reject participant with duplicate email', async () => {
      prismaService.participant.findUnique.mockResolvedValueOnce(
        mockParticipant,
      );

      await expect(
        service.create({
          name: 'Another Budi',
          email: 'budi@bsjp.local',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('enroll', () => {
    it('should enroll participant into tournament', async () => {
      const result = await service.enroll(
        mockTournament.id,
        mockParticipant.id,
      );
      expect(result).toBeDefined();
      expect(prismaService.tournamentParticipant.create).toHaveBeenCalledWith({
        data: {
          tournamentId: mockTournament.id,
          participantId: mockParticipant.id,
        },
        include: { participant: true },
      });
    });

    it('should throw ConflictException if already enrolled', async () => {
      prismaService.tournamentParticipant.findUnique.mockResolvedValueOnce(
        mockMembership,
      );

      await expect(
        service.enroll(mockTournament.id, mockParticipant.id),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if tournament does not exist', async () => {
      prismaService.tournament.findUnique.mockResolvedValueOnce(null);

      await expect(
        service.enroll('non-existent-tournament', mockParticipant.id),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTournamentParticipants', () => {
    it('should return enrolled participants with pick counts', async () => {
      const result = await service.getTournamentParticipants(mockTournament.id);
      expect(result).toHaveLength(1);
      expect(result[0].picksCount).toBe(2);
    });
  });
});
