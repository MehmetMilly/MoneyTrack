const { spawn } = require('node:child_process');
const path = require('node:path');

const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const shimPath = path.resolve(__dirname, 'vercel-hostname-shim.cjs');
const existingNodeOptions = process.env.NODE_OPTIONS ? `${process.env.NODE_OPTIONS} ` : '';
const vercelCliVersion = '54.7.1';

const child = spawn(npxBin, ['--yes', `vercel@${vercelCliVersion}`, ...process.argv.slice(2)], {
  cwd: path.resolve(__dirname, '..'),
  env: {
    ...process.env,
    NODE_OPTIONS: `${existingNodeOptions}--require=${shimPath}`,
  },
  shell: false,
  stdio: 'inherit',
});

child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exitCode = code ?? 1;
});
