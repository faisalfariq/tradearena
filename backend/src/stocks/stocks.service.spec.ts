import { Test, TestingModule } from '@nestjs/testing';
import { StocksService } from './stocks.service';
import { PrismaService } from '../prisma/prisma.service';
import { ConflictException, NotFoundException } from '@nestjs/common';

describe('StocksService', () => {
  let service: StocksService;
  let prismaService: any;

  const mockStock = {
    id: 'stock-uuid-1',
    symbol: 'BBCA',
    name: 'Bank Central Asia Tbk',
    exchange: 'IDX',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    prismaService = {
      stock: {
        create: jest.fn().mockResolvedValue(mockStock),
        findMany: jest.fn().mockResolvedValue([mockStock]),
        findUnique: jest.fn().mockImplementation(({ where }) => {
          if (where.id === mockStock.id || where.symbol === mockStock.symbol) {
            return mockStock;
          }
          return null;
        }),
        update: jest.fn().mockImplementation(({ data }) => ({
          ...mockStock,
          ...data,
        })),
        delete: jest.fn().mockResolvedValue(mockStock),
      },
      stockPick: {
        count: jest.fn().mockResolvedValue(0),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StocksService,
        { provide: PrismaService, useValue: prismaService },
      ],
    }).compile();

    service = module.get<StocksService>(StocksService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create a new stock with uppercase ticker', async () => {
      prismaService.stock.findUnique.mockResolvedValueOnce(null);

      const result = await service.create({
        symbol: 'bbri',
        name: 'Bank Rakyat Indonesia Tbk',
      });

      expect(result).toBeDefined();
      expect(prismaService.stock.create).toHaveBeenCalledWith({
        data: {
          symbol: 'BBRI',
          name: 'Bank Rakyat Indonesia Tbk',
          exchange: 'IDX',
          isActive: true,
        },
      });
    });

    it('should reject duplicate stock symbol with ConflictException', async () => {
      prismaService.stock.findUnique.mockResolvedValueOnce(mockStock);

      await expect(
        service.create({
          symbol: 'BBCA',
          name: 'Duplicate Bank Central Asia',
        }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('findAll', () => {
    it('should return all stocks matching search filter', async () => {
      const result = await service.findAll('BBC', true);
      expect(result).toEqual([mockStock]);
      expect(prismaService.stock.findMany).toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('should return stock if exists', async () => {
      const result = await service.findOne(mockStock.id);
      expect(result).toEqual(mockStock);
    });

    it('should throw NotFoundException if not found', async () => {
      prismaService.stock.findUnique.mockResolvedValueOnce(null);
      await expect(service.findOne('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
