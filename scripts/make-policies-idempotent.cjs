const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

function processFile(filePath) {
  let txt = fs.readFileSync(filePath, 'utf8');
  const lines = txt.split(/\r?\n/);
  const out = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const createMatch = line.match(
      /CREATE POLICY\s+"([^"]+)"\s+ON\s+([\w\.]+)/i
    );
    const execCreateMatch = line.match(
      /EXECUTE\s+'CREATE POLICY\s+"([^']+)"\s+ON\s+([\w\.]+)\s+/i
    );

    if (createMatch) {
      const name = createMatch[1];
      const table = createMatch[2];
      const dropLine = `DROP POLICY IF EXISTS "${name}" ON ${table};`;
      // check if file already contains drop for same policy
      if (!txt.includes(`DROP POLICY IF EXISTS "${name}"`)) {
        out.push(dropLine);
      }
      out.push(line);
      continue;
    }

    if (execCreateMatch) {
      const name = execCreateMatch[1];
      const table = execCreateMatch[2];
      const dropExec = `EXECUTE 'DROP POLICY IF EXISTS "${name}" ON ${table}';`;
      if (!txt.includes(`DROP POLICY IF EXISTS "${name}"`)) {
        out.push(dropExec);
      }
      out.push(line);
      continue;
    }

    out.push(line);
  }

  const newText = out.join('\n');
  if (newText !== txt) {
    fs.writeFileSync(filePath, newText, 'utf8');
    console.log('Patched', path.relative(migrationsDir, filePath));
  }
}

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    const stat = fs.statSync(p);
    if (stat.isDirectory()) walk(p);
    else if (name.endsWith('.sql')) processFile(p);
  }
}

walk(migrationsDir);
console.log('Done.');
