#!/usr/bin/env node
import fs from 'fs/promises';
import path from 'path';

function usage() {
  console.log(
    'Usage: node scripts/generate-internalize-report.mjs --dir=PATH --out=PATH'
  );
  process.exit(1);
}

const argv = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const [k, v] = a.includes('=') ? a.split('=') : [a, true];
    return [k.replace(/^-+/, '').toLowerCase(), v];
  })
);

const dir = argv.dir ? String(argv.dir) : '.';
const out = argv.out ? String(argv.out) : 'reports/internalize-report.json';

const errorPatterns = [
  /AbortError/i,
  /Timeout/i,
  /ECONNREFUSED/i,
  /ENOTFOUND/i,
  /SSL/i,
  /certificate/i,
  /status"?\s*[:=]\s*5\d{2}/i,
  /HTTP\/1\.[01]\s+5\d{2}/i,
  /curl:\s*\(\d+\)/i,
  /Traceback \(most recent call last\)/i,
  /Error:\s+/i,
];

async function listFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];
  for (const e of entries) {
    const full = path.join(dirPath, e.name);
    if (e.isDirectory()) {
      files.push(...(await listFiles(full)));
    } else {
      files.push(full);
    }
  }
  return files;
}

function firstMatchSnippet(text, patterns) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) {
      const idx = Math.max(0, m.index - 80);
      return text
        .slice(idx, idx + 400)
        .replace(/\s+/g, ' ')
        .trim();
    }
  }
  return text.slice(0, 400).replace(/\s+/g, ' ').trim();
}

async function inspectFile(file) {
  const ext = path.extname(file).toLowerCase();
  try {
    const raw = await fs.readFile(file, 'utf8');
    // try JSON
    try {
      const j = JSON.parse(raw);
      // heurísticas: status, ok, error
      if (
        j == null ||
        (typeof j === 'object' &&
          (j.error || j.errors || j.status >= 400 || j.ok === false))
      ) {
        return {
          file,
          type: 'json',
          parsed: j,
          message:
            j.error ||
            j.message ||
            (j.status ? `status ${j.status}` : 'json indicates failure'),
          snippet: JSON.stringify(j).slice(0, 1000),
        };
      }
      // if JSON but no error, still return null
      return null;
    } catch (e) {
      // not json, search for error patterns
      const match = errorPatterns.find((p) => p.test(raw));
      if (match) {
        return {
          file,
          type: 'text',
          message: (raw.match(match) || [match.toString()])[0],
          snippet: firstMatchSnippet(raw, errorPatterns),
        };
      }
      // if it's a response file that contains HTTP status line
      const statusMatch = raw.match(/HTTP\/1\.[01]\s+(\d{3})/i);
      if (statusMatch && Number(statusMatch[1]) >= 400) {
        return {
          file,
          type: 'text',
          message: `HTTP ${statusMatch[1]}`,
          snippet: firstMatchSnippet(raw, [/HTTP\/1\.[01]\s+\d{3}/i]),
        };
      }
      return null;
    }
  } catch (err) {
    return { file, type: 'read-error', message: String(err), snippet: '' };
  }
}

async function main() {
  const absDir = path.resolve(dir);
  const allFiles = await listFiles(absDir);
  const candidates = allFiles.filter((f) => {
    const e = path.extname(f).toLowerCase();
    return (
      ['.log', '.txt', '.json', '.jsonl', '.out', '.err'].includes(e) ||
      f.toLowerCase().includes('resp') ||
      f.toLowerCase().includes('curl')
    );
  });

  const failures = [];
  for (const f of candidates) {
    const info = await inspectFile(f);
    if (info) failures.push(info);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    scannedDirectory: absDir,
    scannedFilesCount: candidates.length,
    failuresCount: failures.length,
    failures,
  };

  const outPath = path.resolve(out);
  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`Report written to ${outPath}`);
  console.log(
    `Scanned ${candidates.length} candidate files — ${failures.length} failures found.`
  );
  if (failures.length > 0)
    console.table(
      failures.map((f) => ({
        file: path.relative(process.cwd(), f.file),
        message: f.message,
      }))
    );
}

main().catch((err) => {
  console.error('Failed to generate report:', err);
  process.exit(2);
});
