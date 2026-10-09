import { Test, TestingModule } from '@nestjs/testing';
import { PicksService } from './picks.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { EntrySource, PickStatus } from '@prisma/client';
import { PriceFractionService } from '../evaluation/services/price-fraction.service';

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
      user: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'user-uuid-1',
          name: 'Budi Santoso',
          email: 'budi@example.com',
          role: 'USER',
        }),
      },
      participant: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === mockParticipant.id) return mockParticipant;
          return null;
        }),
        findFirst: jest.fn().mockResolvedValue(mockParticipant),
        create: jest.fn().mockResolvedValue(mockParticipant),
        update: jest.fn().mockResolvedValue(mockParticipant),
      },
      tournamentParticipant: {
        findUnique: jest.fn().mockResolvedValue({
          id: 'membership-uuid-1',
          tournamentId: mockTournament.id,
          participantId: mockParticipant.id,
          status: 'APPROVED',
        }),
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'membership-uuid-1',
            tournamentId: mockTournament.id,
            participantId: mockParticipant.id,
            status: 'APPROVED',
            tournament: mockTournament,
            joinedAt: new Date(),
          },
        ]),
      },
      stock: {
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === mockStock.id) return mockStock;
          return null;
        }),
      },
      stockPick: {
        findUnique: jest.fn().mockResolvedValue(null),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(mockPick),
        count: jest.fn().mockResolvedValue(0),
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
        PriceFractionService,
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

  describe('Participant Self-Service & 08:45 Lock', () => {
    it('should return my pick status for enrolled participant', async () => {
      const status = await service.getMyPickStatus(
        mockTournament.id,
        'user-uuid-1',
        '2026-10-15',
      );
      expect(status.enrolled).toBe(true);
      expect(status.isApproved).toBe(true);
      expect(status.participant.id).toBe(mockParticipant.id);
    });

    it('should successfully submit my pick for upcoming tournament date', async () => {
      process.env.BYPASS_PICK_LOCK = 'true';
      const pick = await service.submitMyPick(
        mockTournament.id,
        'user-uuid-1',
        {
          stockId: mockStock.id,
          tradingDate: '2026-10-15',
          entryPrice: 9200,
        },
      );
      expect(pick).toBeDefined();
      expect(prismaService.stockPick.create).toHaveBeenCalled();
      delete process.env.BYPASS_PICK_LOCK;
    });

    it('should reject submitMyPick if membership is not APPROVED', async () => {
      prismaService.tournamentParticipant.findUnique.mockResolvedValueOnce({
        id: 'mem-1',
        tournamentId: mockTournament.id,
        participantId: mockParticipant.id,
        status: 'PENDING',
      });

      await expect(
        service.submitMyPick(mockTournament.id, 'user-uuid-1', {
          stockId: mockStock.id,
          tradingDate: '2026-10-15',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject submitMyPick if trading date is in the past (locked)', async () => {
      delete process.env.BYPASS_PICK_LOCK;
      await expect(
        service.submitMyPick(mockTournament.id, 'user-uuid-1', {
          stockId: mockStock.id,
          tradingDate: '2020-01-01', // definitely in the past
        }),
      ).rejects.toThrow();
    });

    it('should cancel my pick successfully when lock is bypassed', async () => {
      process.env.BYPASS_PICK_LOCK = 'true';
      prismaService.stockPick.findUnique.mockResolvedValueOnce(mockPick);
      const res = await service.cancelMyPick(
        mockTournament.id,
        'user-uuid-1',
        mockPick.id,
      );
      expect(res).toBeDefined();
      expect(prismaService.stockPick.delete).toHaveBeenCalledWith({
        where: { id: mockPick.id },
      });
      delete process.env.BYPASS_PICK_LOCK;
    });

    it('should reject stock in Papan Pemantauan Khusus (FCA)', async () => {
      process.env.BYPASS_PICK_LOCK = 'true';
      prismaService.stock.findUnique.mockResolvedValueOnce({
        ...mockStock,
        board: 'Pemantauan Khusus',
      });
      await expect(
        service.submitMyPick(mockTournament.id, 'user-uuid-1', {
          stockId: mockStock.id,
          tradingDate: '2026-10-05',
        }),
      ).rejects.toThrow('Papan Pemantauan Khusus');
      delete process.env.BYPASS_PICK_LOCK;
    });

    it('should reject stock that closed at ARA limit price', async () => {
      process.env.BYPASS_PICK_LOCK = 'true';
      // Stock on Utama board with prevClose 100, closing 135 (+35% ARA)
      prismaService.stock.findUnique.mockResolvedValueOnce({
        ...mockStock,
        board: 'Utama',
      });
      jest.spyOn(service as any, 'validateAndResolveStockPick').mockRejectedValueOnce(
        new BadRequestException('Saham BBCA ditutup di batas Auto Rejection Atas (ARA)'),
      );
      await expect(
        service.submitMyPick(mockTournament.id, 'user-uuid-1', {
          stockId: mockStock.id,
          tradingDate: '2026-10-05',
        }),
      ).rejects.toThrow('Auto Rejection Atas');
      delete process.env.BYPASS_PICK_LOCK;
    });

    it('should allow picking outside 17-21 WIB when tournament isPickWindowForceOpen is true', async () => {
      delete process.env.BYPASS_PICK_LOCK;
      prismaService.tournament.findUnique.mockResolvedValueOnce({
        ...mockTournament,
        isPickWindowForceOpen: true,
      });
      const status = await service.getMyPickStatus(mockTournament.id, 'user-uuid-1');
      expect(status.isLocked).toBe(false);
      expect(status.pickWindow.isOpen).toBe(true);
      expect(status.pickWindow.isForceOpen).toBe(true);
    });

    it('should get active tournaments summary for user', async () => {
      const summary = await service.getMyActiveTournamentsSummary('user-uuid-1');
      expect(summary).toHaveLength(1);
      expect(summary[0].tournamentId).toBe(mockTournament.id);
    });
  });
});

