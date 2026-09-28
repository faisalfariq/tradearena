const fs = require('fs');
const path = require('path');

const candidates = [
  path.join(__dirname, 'dist', 'main.js'),
  path.join(__dirname, 'dist', 'src', 'main.js'),
];

let entryPoint = null;
for (const candidate of candidates) {
  if (fs.existsSync(candidate)) {
    entryPoint = candidate;
    break;
  }
}

if (!entryPoint) {
  console.error('[TradeArena] Could not find compiled entrypoint. Checked:', candidates);
  process.exit(1);
}

require(entryPoint);
