import { createClient } from '@supabase/supabase-js';

const userId = process.argv[2];
if (!userId) {
  console.error('Usage: node scripts/check-brands.mjs <user_id>');
  process.exit(2);
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing SUPABASE env vars (NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY)');
  process.exit(2);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

(async () => {
  try {
    console.log('Checking brands and product counts for user:', userId);

    const { data: brandsTable, error: brandsErr } = await supabase
      .from('brands')
      .select('name')
      .eq('user_id', userId);

    if (brandsErr) {
      console.error('brands table query error:', brandsErr.message || brandsErr);
    }

    const brandNamesFromTable = Array.isArray(brandsTable) ? brandsTable.map(b => b.name).filter(Boolean) : [];

    const { data: prodData, error: prodErr } = await supabase
      .from('products')
      .select('brand')
      .eq('user_id', userId)
      .not('brand', 'is', null);

    if (prodErr) {
      console.error('products query error:', prodErr.message || prodErr);
    }

    const counts = {};
    if (Array.isArray(prodData)) {
      prodData.forEach(p => {
        const b = (p?.brand || '').toString().trim();
        if (b) counts[b] = (counts[b] || 0) + 1;
      });
    }

    // Merge names from brands table with counts
    brandNamesFromTable.forEach(n => { if (!counts[n]) counts[n] = 0; });

    const list = Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a,b)=> a.name.localeCompare(b.name));

    console.log('\nBrands found (name -> count of products):');
    if (list.length === 0) console.log('  (none)');
    list.forEach(it => console.log(`  ${it.name} -> ${it.count}`));

    // Also print raw brands table rows
    console.log('\nRaw brands table names:');
    if (brandNamesFromTable.length === 0) console.log('  (none)');
    brandNamesFromTable.forEach(n => console.log('  ', n));

    process.exit(0);
  } catch (e) {
    console.error('unexpected error', e);
    process.exit(2);
  }
})();
