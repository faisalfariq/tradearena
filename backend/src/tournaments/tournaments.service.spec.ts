import { Test, TestingModule } from '@nestjs/testing';
import { TournamentsService } from './tournaments.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  TournamentStatus,
  CandleAmbiguityPolicy,
  GapPolicy,
} from '@prisma/client';

describe('TournamentsService', () => {
  let service: TournamentsService;
  let prismaService: any;

  const mockTournament = {
    id: 'tournament-uuid-1',
    name: 'Turnamen IDX BSJP Musim 1',
    description: 'Turnamen uji coba',
    startDate: new Date('2026-10-01T00:00:00.000Z'),
    endDate: new Date('2026-10-31T23:59:59.000Z'),
    timezone: 'Asia/Jakarta',
    status: TournamentStatus.UPCOMING,
    createdAt: new Date(),
    updatedAt: new Date(),
    rules: {
      id: 'rule-uuid-1',
      tournamentId: 'tournament-uuid-1',
      initialStopPct: 0.03,
      trailingStopPct: 0.03,
      candleAmbiguityPolicy: CandleAmbiguityPolicy.CONSERVATIVE_LOSS_FIRST,
      gapPolicy: GapPolicy.ACTUAL_FIRST_VALID_LEVEL,
      priceFractionPolicy: 'IDX_STANDARD_V1',
      pointsRule: 'PERCENTAGE_RETURN_V1',
      calculationRuleVersion: 'v1.0.0',
    },
  };

  beforeEach(async () => {
    prismaService = {
      tournament: {
        create: jest.fn().mockResolvedValue(mockTournament),
        findMany: jest.fn().mockResolvedValue([mockTournament]),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === mockTournament.id) return mockTournament;
          return null;
        }),
        update: jest.fn().mockImplementation(({ data }) => ({
          ...mockTournament,
          ...data,
        })),
        delete: jest.fn().mockResolvedValue(mockTournament),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TournamentsService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<TournamentsService>(TournamentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a tournament with default BSJP -3% rules', async () => {
      const result = await service.create({
        name: 'Turnamen IDX BSJP Musim 1',
        startDate: '2026-10-01T00:00:00.000Z',
        endDate: '2026-10-31T23:59:59.000Z',
      });

      expect(result).toBeDefined();
      expect(result.id).toBe(mockTournament.id);
      expect(prismaService.tournament.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if endDate is before startDate', async () => {
      await expect(
        service.create({
          name: 'Invalid Tournament',
          startDate: '2026-10-31T00:00:00.000Z',
          endDate: '2026-10-01T00:00:00.000Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return a list of tournaments', async () => {
      const list = await service.findAll();
      expect(Array.isArray(list)).toBe(true);
      expect(list.length).toBe(1);
    });
  });

  describe('findOne', () => {
    it('should return a tournament when it exists', async () => {
      const result = await service.findOne(mockTournament.id);
      expect(result).toBeDefined();
      expect(result.id).toBe(mockTournament.id);
    });

    it('should throw NotFoundException when tournament does not exist', async () => {
      await expect(service.findOne('non-existent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('updateStatus', () => {
    it('should transition status to ACTIVE', async () => {
      const result = await service.updateStatus(
        mockTournament.id,
        TournamentStatus.ACTIVE,
      );
      expect(result.status).toBe(TournamentStatus.ACTIVE);
    });
  });

  describe('remove', () => {
    it('should delete a non-active tournament', async () => {
      const result = await service.remove(mockTournament.id);
      expect(result).toBeDefined();
      expect(prismaService.tournament.delete).toHaveBeenCalled();
    });

    it('should throw BadRequestException when trying to delete an active tournament', async () => {
      prismaService.tournament.findUnique.mockResolvedValueOnce({
        ...mockTournament,
        status: TournamentStatus.ACTIVE,
      });

      await expect(service.remove(mockTournament.id)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
