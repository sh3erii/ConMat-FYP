const { spawn, spawnSync } = require('child_process');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const runNpmSync = (args) => spawnSync(npmCommand, args, {
  cwd: projectRoot,
  stdio: 'inherit',
});

const databaseStart = runNpmSync(['run', 'db:local:ensure', '--workspace', 'backend']);
if (databaseStart.status !== 0) {
  process.exit(databaseStart.status || 1);
}

let closing = false;
let services;

const stopServices = () => {
  if (!services || services.exitCode !== null) return;

  if (process.platform === 'win32') {
    spawnSync('taskkill.exe', ['/PID', String(services.pid), '/T', '/F'], {
      stdio: 'ignore',
    });
  } else {
    services.kill('SIGTERM');
  }
};

const stopDatabase = () => {
  runNpmSync(['run', 'db:local:stop', '--workspace', 'backend']);
};

const shutdown = (exitCode = 0) => {
  if (closing) return;
  closing = true;
  stopServices();
  stopDatabase();
  process.exit(exitCode);
};

services = spawn(npmCommand, ['run', 'dev:local:services'], {
  cwd: projectRoot,
  stdio: 'inherit',
});

services.once('error', (error) => {
  console.error(`Unable to start local development services: ${error.message}`);
  shutdown(1);
});

services.once('exit', (code) => {
  shutdown(code || 0);
});

process.once('SIGINT', () => shutdown(0));
process.once('SIGTERM', () => shutdown(0));
