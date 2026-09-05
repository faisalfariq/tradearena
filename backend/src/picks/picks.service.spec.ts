import { Test, TestingModule } from '@nestjs/testing';
import { PicksService } from './picks.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { EntrySource, PickStatus } from '@prisma/client';

describe('PicksService', () => {
  let service: PicksService;
  let prismaService: any;

  const mockTournament = {
    id: 'tournament-uuid-1',
    name: 'Turnamen BSJP',
    startDate: new Date('2026-10-01T00:00:00.000Z'),
    endDate: new Date('2026-10-31T23:59:59.000Z'),
  };

  const mockParticipant = {
    id: 'participant-uuid-1',
    name: 'Budi Santoso',
  };

  const mockStock = {
    id: 'stock-uuid-1',
    symbol: 'BBCA',
    name: 'Bank Central Asia Tbk',
    isActive: true,
  };

  const mockPick = {
    id: 'pick-uuid-1',
    tournamentId: mockTournament.id,
    participantId: mockParticipant.id,
    stockId: mockStock.id,
    tradingDate: new Date('2026-10-15T00:00:00.000Z'),
    entryPrice: 9200,
    entrySource: EntrySource.MARKET_OPEN,
    status: PickStatus.CONFIRMED,
  };

  beforeEach(async () => {
    prismaService = {
      tournament: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === mockTournament.id) return mockTournament;
          return null;
        }),
      },
      participant: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === mockParticipant.id) return mockParticipant;
          return null;
        }),
      },
      tournamentParticipant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'membership-uuid-1',
          tournamentId: mockTournament.id,
          participantId: mockParticipant.id,
        }),
      },
      stock: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === mockStock.id) return mockStock;
          return null;
        }),
      },
      stockPick: {
        findUnique: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(mockPick),
        findMany: jest.fn().mockResolvedValue([mockPick]),
        update: jest.fn().mockImplementation(({ data }) => ({
          ...mockPick,
          ...data,
        })),
        delete: jest.fn().mockResolvedValue(mockPick),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PicksService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<PicksService>(PicksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should successfully create a valid stock pick', async () => {
      const result = await service.create(mockTournament.id, {
        participantId: mockParticipant.id,
        stockId: mockStock.id,
        tradingDate: '2026-10-15',
        entryPrice: 9200,
      });

      expect(result).toBeDefined();
      expect(prismaService.stockPick.create).toHaveBeenCalled();
    });

    it('should reject pick if participant is not enrolled in the tournament', async () => {
      prismaService.tournamentParticipant.findUnique.mockResolvedValueOnce(
        null,
      );

      await expect(
        service.create(mockTournament.id, {
          participantId: mockParticipant.id,
          stockId: mockStock.id,
          tradingDate: '2026-10-15',
          entryPrice: 9200,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject pick if stock is inactive', async () => {
      prismaService.stock.findUnique.mockResolvedValueOnce({
        ...mockStock,
        isActive: false,
      });

      await expect(
        service.create(mockTournament.id, {
          participantId: mockParticipant.id,
          stockId: mockStock.id,
          tradingDate: '2026-10-15',
          entryPrice: 9200,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject pick if tradingDate is outside tournament duration', async () => {
      await expect(
        service.create(mockTournament.id, {
          participantId: mockParticipant.id,
          stockId: mockStock.id,
          tradingDate: '2026-11-05', // Tournament ends 2026-10-31
          entryPrice: 9200,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject duplicate pick for same participant, tournament, date, and stock with 409 Conflict', async () => {
      prismaService.stockPick.findUnique.mockResolvedValueOnce(mockPick);

      await expect(
        service.create(mockTournament.id, {
          participantId: mockParticipant.id,
          stockId: mockStock.id,
          tradingDate: '2026-10-15',
          entryPrice: 9200,
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should list picks for tournament with date filter', async () => {
      const result = await service.findAll(mockTournament.id, {
        tradingDate: '2026-10-15',
      });
      expect(result).toHaveLength(1);
      expect(prismaService.stockPick.findMany).toHaveBeenCalled();
    });
  });
});
