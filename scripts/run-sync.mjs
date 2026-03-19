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

function runNodeScript(args) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
      cwd: process.cwd(),
    });

    child.stdout.on('data', (d) => {
      process.stdout.write(d);
      outStream.write(d);
    });
    child.stderr.on('data', (d) => {
      process.stderr.write(d);
      outStream.write(d);
    });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) return resolve(0);
      return reject(new Error(`${args.join(' ')} exited with code ${code}`));
    });
  });
}

async function main() {
  try {
    console.log(`\n[run-sync] mode=${mode} starting pipeline...`);

    // Step 1: ensure products pending/failed have URL candidates in products.images when only product_images has them
    await runNodeScript(['scripts/prepare-images-for-sync.mjs']);

    // Step 2: internalize and update products table fields (image_path, variants, gallery)
    await runNodeScript(['scripts/local-sync-full.mjs', ...extra]);

    // Step 3: show final status summary
    await runNodeScript(['scripts/check-images-status.mjs']);

    outStream.end('\nPipeline finished successfully\n');
    process.exit(0);
  } catch (err) {
    outStream.end(`\nPipeline failed: ${err.message || err}\n`);
    console.error('[run-sync] failed:', err.message || err);
    process.exit(1);
  }
}

main();
