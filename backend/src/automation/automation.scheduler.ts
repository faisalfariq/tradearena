import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AutomationService } from './automation.service';
import { StocksService } from '../stocks/stocks.service';

@Injectable()
export class AutomationScheduler {
  private readonly logger = new Logger(AutomationScheduler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly automationService: AutomationService,
    private readonly stocksService: StocksService,
  ) {}

  /**
   * Pre-market cron scheduled at 08:00 WIB (Asia/Jakarta) every Monday through Friday
   * (1 jam sebelum pembukaan pasar reguler BEI jam 09:00 WIB).
   * Automatically refreshes IDX stocks universe and updates board & status classifications.
   */
  @Cron('0 8 * * 1-5', {
    name: 'pre-market-idx-stocks-sync',
    timeZone: 'Asia/Jakarta',
  })
  async handlePreMarketStocksSync() {
    this.logger.log('Executing automated pre-market IDX stock catalog sync (08:00 WIB)...');
    try {
      const res = await this.stocksService.syncIdxStocks();
      this.logger.log(`Pre-market stock sync completed successfully: ${res.message}`);
      return res;
    } catch (err: any) {
      this.logger.error(`Error in automated pre-market stock sync: ${err.message}`);
    }
  }

  /**
   * Daily cron job scheduled at 16:30 WIB (Asia/Jakarta) every Monday through Friday
   * (tepat 30 menit setelah penutupan pasar reguler bursa IDX jam 16:00 WIB).
   * Runs the complete post-market pipeline for all active tournaments automatically.
   */
  @Cron('30 16 * * 1-5', {
    name: 'post-market-daily-pipeline',
    timeZone: 'Asia/Jakarta',
  })
  async handlePostMarketCron(customDateStr?: string) {
    this.logger.log('Executing automated post-market cron job (16:30 WIB - 30 mins after market close)...');

    const activeTournaments = await this.prisma.tournament.findMany({
      where: { status: 'ACTIVE' },
    });

    if (activeTournaments.length === 0) {
      this.logger.log('No ACTIVE tournaments found for post-market pipeline.');
      return { status: 'NO_ACTIVE_TOURNAMENTS', processed: 0, results: [] };
    }

    const todayStr =
      customDateStr ||
      new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta' }).format(new Date());

    const results = [];
    for (const tournament of activeTournaments) {
      try {
        this.logger.log(
          `Triggering automated pipeline for tournament: ${tournament.name} (${tournament.id}) on date ${todayStr}`,
        );
        const report = await this.automationService.runDailyPipeline(
          tournament.id,
          todayStr,
        );
        this.logger.log(
          `Pipeline finished for "${tournament.name}": status=${report.overallStatus}, evaluated=${report.evaluatedCount}`,
        );
        results.push({
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          overallStatus: report.overallStatus,
          evaluatedCount: report.evaluatedCount,
          report,
        });
      } catch (err: any) {
        this.logger.error(
          `Error running automated pipeline for tournament "${tournament.name}": ${err.message}`,
        );
        results.push({
          tournamentId: tournament.id,
          tournamentName: tournament.name,
          overallStatus: 'FAILED',
          error: err.message,
        });
      }
    }

    return {
      status: 'COMPLETED',
      tradingDate: todayStr,
      processedCount: results.length,
      tournaments: results,
    };
  }
}
