const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const jsonPath = path.join(rootDir, 'backend/src/stocks/data/idx-stocks.json');
const stocks = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const akselerasi = stocks.filter(s => s.board === 'Akselerasi').map(s => s.symbol);
const fca = stocks.filter(s => s.board === 'Pemantauan Khusus').map(s => s.symbol);
const pengembangan = stocks.filter(s => s.board === 'Pengembangan').map(s => s.symbol);
const ekonomiBaru = stocks.filter(s => s.board === 'Ekonomi Baru').map(s => s.symbol);

const tsContent = `// Auto-generated IDX Stock Boards Mapping
export const AKSELERASI_SYMBOLS = new Set<string>(${JSON.stringify(akselerasi)});

export const FCA_SYMBOLS = new Set<string>(${JSON.stringify(fca)});

export const PENGEMBANGAN_SYMBOLS = new Set<string>(${JSON.stringify(pengembangan)});

export const EKONOMI_BARU_SYMBOLS = new Set<string>(${JSON.stringify(ekonomiBaru)});

/**
 * Returns accurate IDX board for symbol, prioritizing official IDX categorization
 */
export function resolveIdxStockBoard(symbol: string, existingBoard?: string): string {
  const clean = (symbol || '').trim().toUpperCase();
  if (AKSELERASI_SYMBOLS.has(clean)) return 'Akselerasi';
  if (FCA_SYMBOLS.has(clean)) return 'Pemantauan Khusus';
  if (PENGEMBANGAN_SYMBOLS.has(clean)) return 'Pengembangan';
  if (EKONOMI_BARU_SYMBOLS.has(clean)) return 'Ekonomi Baru';
  if (existingBoard && existingBoard.trim() && existingBoard.trim().toLowerCase() !== 'utama') {
    return existingBoard.trim();
  }
  return 'Utama';
}
`;

const tsPath = path.join(rootDir, 'backend/src/stocks/data/stock-boards.ts');
fs.writeFileSync(tsPath, tsContent, 'utf-8');
console.log('Successfully created', tsPath);

// Also generate migration SQL to update all boards in the database
const migrationDir = path.join(rootDir, 'backend/prisma/migrations/20261009150000_update_stock_boards');
if (!fs.existsSync(migrationDir)) {
  fs.mkdirSync(migrationDir, { recursive: true });
}

function escapeSqlList(arr) {
  return arr.map(s => `'${s.replace(/'/g, "''")}'`).join(', ');
}

const sqlContent = `-- Migration: 20261009150000_update_stock_boards
-- Update stock boards based on official IDX data
UPDATE "stocks" SET "board" = 'Akselerasi' WHERE "symbol" IN (${escapeSqlList(akselerasi)});
UPDATE "stocks" SET "board" = 'Pemantauan Khusus' WHERE "symbol" IN (${escapeSqlList(fca)});
UPDATE "stocks" SET "board" = 'Pengembangan' WHERE "symbol" IN (${escapeSqlList(pengembangan)});
UPDATE "stocks" SET "board" = 'Ekonomi Baru' WHERE "symbol" IN (${escapeSqlList(ekonomiBaru)});
`;

const sqlPath = path.join(migrationDir, 'migration.sql');
fs.writeFileSync(sqlPath, sqlContent, 'utf-8');
console.log('Successfully created migration', sqlPath);
