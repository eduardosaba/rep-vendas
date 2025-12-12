import fs from 'fs/promises';
import { Client } from 'pg';

async function main() {
  const conn = process.argv[2] || process.env.CONN;
  const file = process.argv[3];
  if (!conn) {
    console.error(
      'Uso: node scripts/apply-sql.mjs <connection-string> <sql-file>'
    );
    process.exit(2);
  }
  if (!file) {
    console.error('Especifique o arquivo SQL a aplicar.');
    process.exit(2);
  }

  try {
    const sql = await fs.readFile(file, 'utf8');
    const client = new Client({ connectionString: conn });
    await client.connect();
    console.log('Conectado ao banco, executando SQL...');
    await client.query(sql);
    console.log('SQL executado com sucesso:', file);
    await client.end();
    process.exit(0);
  } catch (err) {
    console.error('Erro ao aplicar SQL:', err.message || err);
    console.error(err);
    process.exit(1);
  }
}

main();
