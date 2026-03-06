#!/usr/bin/env node
import { spawn } from 'child_process';
import path from 'path';

const cwd = process.cwd();
const portArgIndex = process.argv.findIndex((a) => a === '--port');
const port = portArgIndex !== -1 ? process.argv[portArgIndex + 1] : '4000';

function runScript(cmd, args = []) {
  return new Promise((resolve, reject) => {
    const envClean = { ...process.env };
    if (envClean.NODE_OPTIONS) {
      envClean.NODE_OPTIONS = envClean.NODE_OPTIONS
        .split(/\s+/)
        .filter((opt) => opt && !opt.includes('--localstorage-file'))
        .join(' ')
        .trim();

      if (envClean.NODE_OPTIONS === '') delete envClean.NODE_OPTIONS;
    }
    // remove any orphaned env var used by polyfills or wrappers
    if (envClean.LOCALSTORAGE_FILE) delete envClean.LOCALSTORAGE_FILE;

    const child = spawn(process.execPath, [cmd, ...args], {
      stdio: 'inherit',
      cwd,
      env: envClean,
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
    // Build a minimal, whitelist-based environment for the child process to
    // guarantee external NODE_OPTIONS (or other injected flags) are not
    // inherited. This avoids needing to restart VS Code or the parent shell.
    const shimPath = path.resolve(cwd, 'scripts', 'ensure-localstorage.cjs');

    const essentialKeys = [
      'PATH', 'Path', 'TEMP', 'TMP', 'HOME', 'USERPROFILE',
      'APPDATA', 'LOCALAPPDATA', 'SystemRoot', 'ComSpec', 'TERM'
    ];

    const childEnv = {};
    // 1) Keep essential OS vars
    essentialKeys.forEach((k) => {
      if (process.env[k]) childEnv[k] = process.env[k];
    });

    // 2) Preserve safe public/runtime env vars (NEXT_PUBLIC_*, SUPABASE_*, POPUP_ADMIN_SECRET, etc.)
    Object.keys(process.env).forEach((k) => {
      if (
        k.startsWith('NEXT_PUBLIC_') ||
        k.startsWith('SUPABASE_') ||
        k === 'INTERNAL_MIDDLEWARE_SECRET' ||
        k === 'POPUP_ADMIN_SECRET' ||
        k === 'REVALIDATE_TOKEN'
      ) {
        childEnv[k] = process.env[k];
      }
    });

    // 3) Set a safe NODE_OPTIONS explicitly (no --localstorage-file inherited)
    childEnv.NODE_OPTIONS = '--max-old-space-size=4096';

    // 4) Ensure no stray vars remain
    if (childEnv.LOCALSTORAGE_FILE) delete childEnv.LOCALSTORAGE_FILE;

    // Start Next.js dev with a clean env
    const childArgs = [nextBin, 'dev', '--port', port];
    const child = spawn(process.execPath, childArgs, {
      stdio: 'inherit',
      cwd,
      env: childEnv,
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
