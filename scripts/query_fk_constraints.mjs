import dotenv from 'dotenv';
import pg from 'pg';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.SUPABASE_DB_URL;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const match = supabaseUrl.match(/https:\/\/(.*?)\.supabase\.co/);
const projectRef = match ? match[1] : '';

const dbUrl = connectionString || `postgresql://postgres:${process.env.SUPABASE_DB_PASSWORD || 'postgres'}@db.${projectRef}.supabase.co:5432/postgres`;

async function runQuery() {
  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    const query = `
      SELECT
        con.conname,
        con.conrelid::regclass AS source_table,
        con.confrelid::regclass AS referenced_table,
        pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      WHERE con.contype = 'f'
        AND (
          con.conrelid IN (
            'public.profiles'::regclass,
            'public.products'::regclass,
            'public.order_items'::regclass
          )
          OR con.confrelid IN (
            'public.profiles'::regclass,
            'public.products'::regclass,
            'auth.users'::regclass
          )
        )
      ORDER BY source_table::text, con.conname;
    `;
    const res = await client.query(query);
    console.log('=== RESULTADO DA CONSULTA DE CONSTRAINT DE FK ===');
    console.table(res.rows);
    console.log(JSON.stringify(res.rows, null, 2));
    await client.end();
  } catch (err) {
    console.error('Erro na conexão DB:', err.message);
  }
}

runQuery();
