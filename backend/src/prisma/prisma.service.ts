import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    // Optional connection check on startup; soft fail in environments without live DB instance
    try {
      await this.$connect();
    } catch (err) {
      console.warn(
        '[PrismaService] Database connection not established at bootstrap:',
        (err as Error).message,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
