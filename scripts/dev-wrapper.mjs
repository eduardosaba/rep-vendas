#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';

const cwd = process.cwd();
const portArgIndex = process.argv.findIndex((a) => a === '--port');
const port = portArgIndex !== -1 ? process.argv[portArgIndex + 1] : '4000';

function runScript(cmd, args = []) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [cmd, ...args], {
      stdio: 'inherit',
      cwd,
      env: process.env,
    });
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${cmd} exited with ${code}`));
    });
  });
}

(async () => {
  try {
    // 1) Run the existing checks (these are small scripts)
    await runScript(path.join('scripts', 'check-env.js'));
    await runScript(path.join('scripts', 'check-assets.js'));

    // 2) Start next dev with preloaded polyfill
    const nextBin = path.resolve(cwd, 'node_modules', 'next', 'dist', 'bin', 'next');
    const polyfill = path.resolve(cwd, 'scripts', 'polyfill-localstorage.mjs');
    const child = spawn(process.execPath, ['-r', polyfill, nextBin, 'dev', '--port', port], {
      stdio: 'inherit',
      cwd,
      env: process.env,
    });

    const forward = (sig) => {
      if (child.pid) child.kill(sig);
    };
    process.on('SIGINT', () => forward('SIGINT'));
    process.on('SIGTERM', () => forward('SIGTERM'));

    child.on('close', (code) => process.exit(code ?? 0));
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
})();
