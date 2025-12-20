import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.error(
    'Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  );
  process.exit(1);
}

const supabase = createClient(url, key, {
  global: { headers: { 'x-client-check': 'check-script' } },
});

(async () => {
  try {
    console.log('Connecting to Supabase...');
    const { data, error, status } = await supabase
      .from('products')
      .select('id')
      .limit(1);

    if (error) {
      console.error('Supabase returned error:', error.message || error);
      console.error('Full error:', error);
      process.exit(2);
    }

    console.log(
      'Query OK — rows returned:',
      Array.isArray(data) ? data.length : 0
    );
    console.log('HTTP status:', status);
    console.log('Sample row:', data && data[0] ? data[0] : 'none');
    process.exit(0);
  } catch (e) {
    console.error('Exception while querying Supabase:', e);
    process.exit(3);
  }
})();
