const fs = require('fs');
const path = require('path');
const Module = require('module');

// Ensure module lookup searches both local backend/node_modules and root node_modules
const searchPaths = [
  path.resolve(__dirname, 'node_modules'),
  path.resolve(__dirname, '..', 'node_modules'),
];

for (const sp of searchPaths) {
  if (fs.existsSync(sp) && !module.paths.includes(sp)) {
    module.paths.unshift(sp);
  }
}

// Patch Module._nodeModulePaths so internal requires from nested packages can resolve hoisted dependencies
const originalNodeModulePaths = Module._nodeModulePaths;
Module._nodeModulePaths = function (from) {
  const paths = originalNodeModulePaths.call(this, from);
  for (const sp of searchPaths) {
    if (!paths.includes(sp)) {
      paths.push(sp);
    }
  }
  return paths;
};

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
