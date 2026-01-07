const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function gitLsFiles() {
  const out = execSync('git ls-files', { encoding: 'utf8' });
  return out.split('\n').filter(Boolean);
}

function findFiles() {
  const exts = ['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs'];
  const files = gitLsFiles().filter((f) => exts.some((e) => f.endsWith(e)));
  return files;
}

function tryResolveImport(fromFileDir, spec) {
  const exts = [
    '.ts',
    '.tsx',
    '.js',
    '.jsx',
    '.mjs',
    '.cjs',
    '/index.ts',
    '/index.tsx',
    '/index.js',
  ];
  const base = path.resolve(fromFileDir, spec);
  const candidates = exts
    .map((e) => base + e)
    .concat(exts.map((e) => base + e));
  // also include the exact spec if it has extension
  candidates.unshift(base);
  // remove duplicates
  const seen = new Set();
  const uniq = candidates.filter((c) => {
    if (seen.has(c)) return false;
    seen.add(c);
    return true;
  });
  return uniq;
}

function main() {
  const repoFiles = gitLsFiles();
  const repoFilesLower = new Map();
  for (const f of repoFiles) repoFilesLower.set(f.toLowerCase(), f);

  const sourceFiles = findFiles();
  const localImportRegex =
    /(?:from\s+|import\s+|require\()(['\"])(\.\.\/|\.\/)([^'\"]+)\1/g;

  const problems = [];

  for (const file of sourceFiles) {
    const content = fs.readFileSync(file, 'utf8');
    let match;
    const dir = path.dirname(file);
    const re =
      /(?:from\s+|import\s+|require\()(['\"])(\.\.\/|\.\/)([^'\"]+)\1/g;
    while ((match = re.exec(content)) !== null) {
      const spec = match[2] + match[3];
      const rawSpec = match[0];
      const tried = tryResolveImport(dir, spec);
      let found = null;
      for (const t of tried) {
        const rel = path.relative(process.cwd(), t).replace(/\\/g, '/');
        const lower = rel.toLowerCase();
        if (repoFilesLower.has(lower)) {
          found = repoFilesLower.get(lower);
          break;
        }
      }
      if (found) {
        // compute expected relative path from file to found using posix
        const actualRel = path
          .relative(dir, path.resolve(process.cwd(), found))
          .replace(/\\/g, '/');
        let importPathUsed = spec.replace(/\\/g, '/');
        // normalize: remove extension from actualRel for comparison if import omitted
        const actualRelNoExt = actualRel.replace(
          /(\/index)?(\.tsx?|\.jsx?|\.mjs|\.cjs)$/,
          ''
        );
        const usedNormalized = importPathUsed.replace(
          /(\.tsx?|\.jsx?|\.mjs|\.cjs)$/,
          ''
        );
        if (usedNormalized !== actualRelNoExt) {
          problems.push({
            file,
            import: spec,
            resolved: found,
            actualRel,
            actualRelNoExt,
            usedNormalized,
          });
        }
      } else {
        problems.push({ file, import: spec, resolved: null });
      }
    }
  }

  if (problems.length === 0) {
    console.log('No import case mismatches or missing local imports found.');
    process.exit(0);
  }

  console.log('Found potential issues:');
  for (const p of problems) {
    if (!p.resolved) {
      console.log(`- ${p.file}: import "${p.import}" -> NOT FOUND`);
    } else {
      console.log(
        `- ${p.file}: import "${p.import}" -> resolved to "${p.resolved}" (actual rel: "${p.actualRelNoExt}")`
      );
    }
  }
  process.exit(2);
}

main();
