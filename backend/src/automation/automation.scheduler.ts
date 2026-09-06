import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AutomationService } from './automation.service';

@Injectable()
export class AutomationScheduler {
  private readonly logger = new Logger(AutomationScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly automationService: AutomationService,
  ) {}

  /**
   * Daily cron job scheduled at 16:15 WIB (Asia/Jakarta) every Monday through Friday.
   * Runs the complete post-market pipeline for all active tournaments.
   */
  @Cron('15 16 * * 1-5', {
    name: 'post-market-daily-pipeline',
    timeZone: 'Asia/Jakarta',
  })
  async handlePostMarketCron() {
    this.logger.log('Executing automated post-market cron job (16:15 WIB)...');

    const activeTournaments = await this.prisma.tournament.findMany({
      where: { status: 'ACTIVE' },
    });

    if (activeTournaments.length === 0) {
      this.logger.log('No ACTIVE tournaments found for post-market pipeline.');
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];

    for (const tournament of activeTournaments) {
      try {
        this.logger.log(
          `Triggering automated pipeline for tournament: ${tournament.name} (${tournament.id})`,
        );
        const report = await this.automationService.runDailyPipeline(
          tournament.id,
          todayStr,
        );
        this.logger.log(
          `Pipeline finished for "${tournament.name}": status=${report.overallStatus}, evaluated=${report.evaluatedCount}`,
        );
      } catch (err: any) {
        this.logger.error(
          `Error running automated pipeline for tournament "${tournament.name}": ${err.message}`,
        );
      }
    }
  }
}
