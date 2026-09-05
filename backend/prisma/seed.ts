import {
  PrismaClient,
  Role,
  TournamentStatus,
  CandleAmbiguityPolicy,
  GapPolicy,
  EntrySource,
  PickStatus,
} from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const IDX_STOCKS = [
  { symbol: 'BBCA', name: 'Bank Central Asia Tbk', exchange: 'IDX' },
  { symbol: 'BBRI', name: 'Bank Rakyat Indonesia (Persero) Tbk', exchange: 'IDX' },
  { symbol: 'BMRI', name: 'Bank Mandiri (Persero) Tbk', exchange: 'IDX' },
  { symbol: 'BBNI', name: 'Bank Negara Indonesia (Persero) Tbk', exchange: 'IDX' },
  { symbol: 'TLKM', name: 'Telkom Indonesia (Persero) Tbk', exchange: 'IDX' },
  { symbol: 'ASII', name: 'Astra International Tbk', exchange: 'IDX' },
  { symbol: 'AMMN', name: 'Amman Mineral Internasional Tbk', exchange: 'IDX' },
  { symbol: 'GOTO', name: 'GoTo Gojek Tokopedia Tbk', exchange: 'IDX' },
  { symbol: 'ADRO', name: 'Adaro Energy Indonesia Tbk', exchange: 'IDX' },
  { symbol: 'BRIS', name: 'Bank Syariah Indonesia Tbk', exchange: 'IDX' },
  { symbol: 'UNTR', name: 'United Tractors Tbk', exchange: 'IDX' },
  { symbol: 'ICBP', name: 'Indofood CBP Sukses Makmur Tbk', exchange: 'IDX' },
  { symbol: 'KLBF', name: 'Kalbe Farma Tbk', exchange: 'IDX' },
  { symbol: 'PGAS', name: 'Perusahaan Gas Negara Tbk', exchange: 'IDX' },
  { symbol: 'CPIN', name: 'Charoen Pokphand Indonesia Tbk', exchange: 'IDX' },
];

const DEMO_PARTICIPANTS = [
  { name: 'Budi Santoso', email: 'budi@bsjp.local', phoneNumber: '081234567890' },
  { name: 'Siti Rahma', email: 'siti@bsjp.local', phoneNumber: '081234567891' },
  { name: 'Denny Pratama', email: 'denny@bsjp.local', phoneNumber: '081234567892' },
  { name: 'Hendra Wijaya', email: 'hendra@bsjp.local', phoneNumber: '081234567893' },
  { name: 'Rina Kusuma', email: 'rina@bsjp.local', phoneNumber: '081234567894' },
];

async function main() {
  // 1. Seed Admin
  const adminEmail = (process.env.ADMIN_EMAIL || 'admin@tradearena.local').toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD || 'AdminSecurePass123!';
  const adminName = process.env.ADMIN_NAME || 'TradeArena Super Admin';
  const passwordHash = await bcrypt.hash(adminPassword, 10);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: adminName,
      passwordHash,
      role: Role.ADMIN,
    },
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash,
      role: Role.ADMIN,
    },
  });
  console.log(`[SEED] Admin ready: ${admin.email} (${admin.id})`);

  // 2. Seed Stocks
  for (const stock of IDX_STOCKS) {
    await prisma.stock.upsert({
      where: { symbol: stock.symbol },
      update: { name: stock.name, exchange: stock.exchange, isActive: true },
      create: { ...stock, isActive: true },
    });
  }
  console.log(`[SEED] ${IDX_STOCKS.length} IDX stocks seeded`);

  // 3. Seed Participants
  const seededParticipants = [];
  for (const p of DEMO_PARTICIPANTS) {
    const participant = await prisma.participant.upsert({
      where: { email: p.email },
      update: { name: p.name, phoneNumber: p.phoneNumber },
      create: p,
    });
    seededParticipants.push(participant);
  }
  console.log(`[SEED] ${seededParticipants.length} Participants seeded`);

  // 4. Seed Demo Tournament
  const tournamentName = 'BSJP Championship Musim 1 — 2026';
  let tournament = await prisma.tournament.findFirst({
    where: { name: tournamentName },
  });

  if (!tournament) {
    tournament = await prisma.tournament.create({
      data: {
        name: tournamentName,
        description:
          'Turnamen resmi stock picking harian komunitas BSJP dengan evaluasi Cut Loss (-3%) & Trailing Stop (-3% dari peak).',
        startDate: new Date('2026-09-01T00:00:00.000Z'),
        endDate: new Date('2026-09-30T23:59:59.000Z'),
        status: TournamentStatus.ACTIVE,
        rules: {
          create: {
            initialStopPct: 0.03,
            trailingStopPct: 0.03,
            candleAmbiguityPolicy: CandleAmbiguityPolicy.CONSERVATIVE_LOSS_FIRST,
            gapPolicy: GapPolicy.ACTUAL_FIRST_VALID_LEVEL,
            priceFractionPolicy: 'IDX_STANDARD_V1',
            pointsRule: 'PERCENTAGE_RETURN_V1',
          },
        },
      },
    });
    console.log(`[SEED] Tournament created: ${tournament.name} (${tournament.id})`);
  }

  // 5. Enroll participants into tournament
  for (const participant of seededParticipants) {
    await prisma.tournamentParticipant.upsert({
      where: {
        tournamentId_participantId: {
          tournamentId: tournament.id,
          participantId: participant.id,
        },
      },
      update: {},
      create: {
        tournamentId: tournament.id,
        participantId: participant.id,
      },
    });
  }
  console.log(`[SEED] Enrolled ${seededParticipants.length} participants to tournament`);

  // 6. Seed sample stock picks for trading date 2026-09-05
  const bbca = await prisma.stock.findUnique({ where: { symbol: 'BBCA' } });
  const bbri = await prisma.stock.findUnique({ where: { symbol: 'BBRI' } });
  const tlkm = await prisma.stock.findUnique({ where: { symbol: 'TLKM' } });

  const sampleDate = new Date('2026-09-05T00:00:00.000Z');

  if (bbca && seededParticipants[0]) {
    await prisma.stockPick.upsert({
      where: {
        tournamentId_participantId_tradingDate_stockId: {
          tournamentId: tournament.id,
          participantId: seededParticipants[0].id,
          tradingDate: sampleDate,
          stockId: bbca.id,
        },
      },
      update: {},
      create: {
        tournamentId: tournament.id,
        participantId: seededParticipants[0].id,
        stockId: bbca.id,
        tradingDate: sampleDate,
        entryPrice: 10250,
        entrySource: EntrySource.MARKET_OPEN,
        status: PickStatus.CONFIRMED,
      },
    });
  }

  if (bbri && seededParticipants[1]) {
    await prisma.stockPick.upsert({
      where: {
        tournamentId_participantId_tradingDate_stockId: {
          tournamentId: tournament.id,
          participantId: seededParticipants[1].id,
          tradingDate: sampleDate,
          stockId: bbri.id,
        },
      },
      update: {},
      create: {
        tournamentId: tournament.id,
        participantId: seededParticipants[1].id,
        stockId: bbri.id,
        tradingDate: sampleDate,
        entryPrice: 5100,
        entrySource: EntrySource.MARKET_OPEN,
        status: PickStatus.CONFIRMED,
      },
    });
  }

  if (tlkm && seededParticipants[2]) {
    await prisma.stockPick.upsert({
      where: {
        tournamentId_participantId_tradingDate_stockId: {
          tournamentId: tournament.id,
          participantId: seededParticipants[2].id,
          tradingDate: sampleDate,
          stockId: tlkm.id,
        },
      },
      update: {},
      create: {
        tournamentId: tournament.id,
        participantId: seededParticipants[2].id,
        stockId: tlkm.id,
        tradingDate: sampleDate,
        entryPrice: 2950,
        entrySource: EntrySource.MARKET_OPEN,
        status: PickStatus.CONFIRMED,
      },
    });
  }
  console.log('[SEED] Demo stock picks ready');
}

main()
  .catch((e) => {
    console.error('[SEED] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
