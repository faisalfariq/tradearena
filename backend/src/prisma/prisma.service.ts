import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  async onModuleInit() {
    try {
      await this.$connect();
      console.log('[PrismaService] Connected to database.');

      const userCount = await this.user.count();
      if (userCount === 0) {
        console.log('[PrismaService] Empty database detected. Seeding initial admin...');
        const bcrypt = await import('bcrypt');
        const adminEmail = (process.env.ADMIN_EMAIL || 'admin@tradearena.local').toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePass123!';
        const adminName = process.env.ADMIN_NAME || 'TradeArena Super Admin';
        const passwordHash = await bcrypt.hash(adminPassword, 10);

        await this.user.create({
          data: {
            email: adminEmail,
            name: adminName,
            passwordHash,
            role: 'ADMIN' as any,
          },
        });
        console.log(`[PrismaService] Initial admin created: ${adminEmail}`);
      }
    } catch (err) {
      console.warn(
        '[PrismaService] Database connection or init issue:',
        (err as Error).message,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
