#!/usr/bin/env node
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';

const mode = process.argv[2] === 'repair' ? 'repair' : 'full';
const extra = process.argv.slice(3);

// Defaults
if (!process.env.CHUNK_SIZE)
  process.env.CHUNK_SIZE = mode === 'repair' ? '20' : '40';
if (!process.env.PRODUCT_CONCURRENCY)
  process.env.PRODUCT_CONCURRENCY = mode === 'repair' ? '4' : '8';
if (!process.env.IMAGE_CONCURRENCY)
  process.env.IMAGE_CONCURRENCY = mode === 'repair' ? '3' : '6';
if (!process.env.SYNC_ONLY)
  process.env.SYNC_ONLY = mode === 'repair' ? 'failed' : 'pending,failed';

const logFile = path.resolve(
  process.cwd(),
  mode === 'repair' ? 'sync-repair.log' : 'sync-full.log'
);
const outStream = fs.createWriteStream(logFile, { flags: 'a' });

const child = spawn(
  process.execPath,
  ['scripts/local-sync-full.mjs', ...extra],
  {
    env: process.env,
    stdio: ['ignore', 'pipe', 'pipe'],
    cwd: process.cwd(),
  }
);

child.stdout.on('data', (d) => {
  process.stdout.write(d);
  outStream.write(d);
});
child.stderr.on('data', (d) => {
  process.stderr.write(d);
  outStream.write(d);
});
child.on('close', (code) => {
  outStream.end(`\nProcess exited with code ${code}\n`);
  process.exit(code);
});
