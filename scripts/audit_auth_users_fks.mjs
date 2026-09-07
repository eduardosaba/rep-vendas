import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function auditFKs() {
  console.log('=== AUDITORIA COMPLETA DE FOREIGN KEYS QUE REFERENCIAM auth.users ===\n');

  // Try creating an RPC to run the query, or query pg_constraint via RPC if available
  // Let's test calling pg_constraint via rpc or querying information_schema
  const { data, error } = await supabaseAdmin.rpc('exec_sql', {
    sql: `
      SELECT
        con.conname,
        con.conrelid::regclass AS source_table,
        con.confrelid::regclass AS referenced_table,
        pg_get_constraintdef(con.oid) AS definition
      FROM pg_constraint con
      WHERE con.contype = 'f'
        AND con.confrelid = 'auth.users'::regclass
      ORDER BY source_table::text, con.conname;
    `
  });

  if (error) {
    console.log('RPC exec_sql não existe ou falhou:', error.message);
    console.log('\nAuditando tabelas do schema public por amostragem via REST API...');
    // List known public tables and check user_id column
    const knownTables = [
      'profiles', 'products', 'clients', 'orders', 'order_items',
      'saved_carts', 'draft_orders', 'draft_order_items', 'settings',
      'user_preferences', 'organization_members', 'payment_gateways',
      'subscriptions', 'activity_logs', 'user_fcm_tokens', 'short_link_clicks'
    ];

    for (const t of knownTables) {
      const { error: tErr } = await supabaseAdmin.from(t).select('*', { count: 'exact', head: true });
      if (tErr) {
        console.log(`  - ${t}: ${tErr.message}`);
      } else {
        console.log(`  - ${t}: Tabela existente e acessível`);
      }
    }
  } else {
    console.table(data);
  }
}

auditFKs();
