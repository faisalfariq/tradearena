const fs = require('fs');
const path = require('path');

async function downloadIdxStocks() {
  const url = 'https://raw.githubusercontent.com/wildangunawan/Dataset-Saham-IDX/master/List%20Emiten/all.csv';
  console.log('Fetching all IDX stocks from', url);
  const response = await fetch(url);
  const csv = await response.text();
  const lines = csv.trim().split('\n');
  const stocks = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // CSV format: code,name,listingDate,shares,listingBoard
    const parts = line.split(',');
    if (parts.length >= 2) {
      const code = parts[0].trim().toUpperCase();
      let name = parts.slice(1, parts.length - 3).join(',').trim();
      if (!name) name = parts[1].trim();
      name = name.replace(/^"|"$/g, '').trim();
      const listingBoard = parts[parts.length - 1]?.trim() || 'Utama';

      if (code && code.length >= 4) {
        stocks.push({
          symbol: code,
          name: name || code,
          exchange: 'IDX',
          board: listingBoard,
          isActive: true,
        });
      }
    }
  }

  const outDir = path.join(__dirname, '../backend/src/stocks/data');
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outFile = path.join(outDir, 'idx-stocks.json');
  fs.writeFileSync(outFile, JSON.stringify(stocks, null, 2), 'utf-8');
  console.log(`Successfully generated ${stocks.length} IDX stocks into ${outFile}`);
}

downloadIdxStocks().catch(console.error);
