const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const backendDir = path.join(rootDir, 'backend');
const frontendDir = path.join(rootDir, 'frontend');

// Ensure backend/.env exists
const envExamplePath = path.join(rootDir, '.env.example');
const backendEnvPath = path.join(backendDir, '.env');
if (!fs.existsSync(backendEnvPath) && fs.existsSync(envExamplePath)) {
  console.log('[INFO] Copying .env.example to backend/.env...');
  fs.copyFileSync(envExamplePath, backendEnvPath);
}

console.log('=====================================================');
console.log('   TradeArena — Starting Development Environment     ');
console.log('=====================================================');
console.log('[READY] Backend API:  http://localhost:3333/api/v1');
console.log('[READY] Swagger Docs: http://localhost:3333/api/docs');
console.log('[READY] Frontend Web: http://localhost:4444');
console.log('[INFO]  Press Ctrl+C in this terminal to stop both servers.');
console.log('-----------------------------------------------------');

const isWindows = process.platform === 'win32';
const npmCmd = isWindows ? 'npm.cmd' : 'npm';

function spawnService(name, colorCode, cwd, args) {
  const proc = spawn(npmCmd, args, {
    cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: isWindows,
  });

  const prefix = `\x1b[${colorCode}m[${name}]\x1b[0m `;

  proc.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line) => {
      if (line.trim()) console.log(prefix + line);
    });
  });

  proc.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    lines.forEach((line) => {
      if (line.trim()) console.error(prefix + line);
    });
  });

  return proc;
}

// Start backend on port 3001 and frontend on port 3000
const backendProc = spawnService('backend', '34', backendDir, ['run', 'dev']);
const frontendProc = spawnService('frontend', '32', frontendDir, ['run', 'dev']);

function cleanup() {
  console.log('\n[INFO] Stopping TradeArena servers...');
  if (isWindows) {
    if (backendProc.pid) {
      spawn('taskkill', ['/pid', backendProc.pid.toString(), '/T', '/F']);
    }
    if (frontendProc.pid) {
      spawn('taskkill', ['/pid', frontendProc.pid.toString(), '/T', '/F']);
    }
  } else {
    if (backendProc.pid) backendProc.kill('SIGTERM');
    if (frontendProc.pid) frontendProc.kill('SIGTERM');
  }
  process.exit(0);
}

process.on('SIGINT', cleanup);
process.on('SIGTERM', cleanup);
process.on('exit', cleanup);
