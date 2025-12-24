const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');
const outDir = path.join(__dirname, '..', 'reports');
if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

function extractFromFile(filePath) {
  const txt = fs.readFileSync(filePath, 'utf8');
  const results = [];
  // match CREATE POLICY lines and grab following tokens until semicolon
  const re = /CREATE POLICY\s+"([^"]+)"\s+ON\s+([\w\.]+)([\s\S]*?);/gi;
  let m;
  while ((m = re.exec(txt))) {
    const name = m[1];
    const table = m[2];
    const body = m[3];
    const cmdMatch = body.match(/FOR\s+(SELECT|INSERT|UPDATE|DELETE|ALL)/i);
    const cmd = cmdMatch ? cmdMatch[1].toUpperCase() : '';
    const usingMatch = body.match(/USING\s*\(([^)]*)\)/i);
    const withMatch = body.match(/WITH CHECK\s*\(([^)]*)\)/i);
    const usingExpr = usingMatch ? usingMatch[1].trim() : '';
    const withExpr = withMatch ? withMatch[1].trim() : '';
    results.push({ file: path.relative(migrationsDir, filePath), name, table, cmd, usingExpr, withExpr });
  }
  // also match EXECUTE 'CREATE POLICY ...' occurrences
  const reExec = /EXECUTE\s+'CREATE POLICY\s+"([^']+)"\s+ON\s+([\w\.]+)\s+([^']*)';/gi;
  while ((m = reExec.exec(txt))) {
    const name = m[1];
    const table = m[2];
    const body = m[3];
    const cmdMatch = body.match(/FOR\s+(SELECT|INSERT|UPDATE|DELETE|ALL)/i);
    const cmd = cmdMatch ? cmdMatch[1].toUpperCase() : '';
    const usingMatch = body.match(/USING\s*\(([^)]*)\)/i);
    const withMatch = body.match(/WITH CHECK\s*\(([^)]*)\)/i);
    const usingExpr = usingMatch ? usingMatch[1].trim() : '';
    const withExpr = withMatch ? withMatch[1].trim() : '';
    results.push({ file: path.relative(migrationsDir, filePath), name, table, cmd, usingExpr, withExpr });
  }
  return results;
}

function walk(dir) {
  const out = [];
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) out.push(...walk(p));
    else if (name.endsWith('.sql')) out.push(...extractFromFile(p));
  }
  return out;
}

const policies = walk(migrationsDir);
const csv = ['file,table,policy_name,command,using_expr,with_check_expr'];
for (const p of policies) {
  csv.push([p.file, p.table, p.name, p.cmd, `"${p.usingExpr.replace(/"/g,'""')}"`, `"${p.withExpr.replace(/"/g,'""')}"`].join(','));
}
fs.writeFileSync(path.join(outDir, 'policies_report.csv'), csv.join('\n'), 'utf8');
console.log('Wrote reports/policies_report.csv with', policies.length, 'entries');
