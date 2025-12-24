const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const nm = path.join(root, 'node_modules');

function readPkg(jsonPath) {
  try {
    return JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  } catch (e) {
    return null;
  }
}

function scanNodeModules(dir) {
  if (!fs.existsSync(dir)) {
    console.error('node_modules not found at', dir);
    process.exit(1);
  }

  const results = [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const ent of entries) {
    if (ent.name.startsWith('.')) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name.startsWith('@')) {
        // scope
        const scopeEntries = fs.readdirSync(full, { withFileTypes: true });
        for (const s of scopeEntries) {
          if (!s.isDirectory()) continue;
          const pkgPath = path.join(full, s.name, 'package.json');
          const pkg = readPkg(pkgPath);
          if (pkg && pkg.scripts) {
            const keys = Object.keys(pkg.scripts);
            const interesting = keys.filter(k => /install|postinstall|prepare/i.test(k));
            if (interesting.length) {
              results.push({ name: `${ent.name}/${s.name}`, version: pkg.version, scripts: interesting });
            }
          }
        }
      } else {
        const pkgPath = path.join(full, 'package.json');
        const pkg = readPkg(pkgPath);
        if (pkg && pkg.scripts) {
          const keys = Object.keys(pkg.scripts);
          const interesting = keys.filter(k => /install|postinstall|prepare/i.test(k));
          if (interesting.length) {
            results.push({ name: ent.name, version: pkg.version, scripts: interesting });
          }
        }
      }
    }
  }

  return results;
}

const out = scanNodeModules(nm);
if (!out.length) {
  console.log('No packages with install/postinstall/prepare scripts found in node_modules.');
  process.exit(0);
}

console.log('Packages with install/postinstall/prepare scripts:');
out.sort((a,b)=>a.name.localeCompare(b.name)).forEach(p=>{
  console.log(`- ${p.name}@${p.version} -> scripts: ${p.scripts.join(', ')}`);
});

console.log('\nTotal:', out.length);
