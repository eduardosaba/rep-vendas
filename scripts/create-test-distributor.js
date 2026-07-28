import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function run() {
  const slug = 'distribuidora-teste';
  
  // 1. Check if it exists
  const { data: existing } = await supabase
    .from('organizations')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();

  if (existing) {
    console.log('Test distributor already exists with ID:', existing.id);
    return;
  }

  // 2. Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert([
      {
        name: 'Distribuidora Teste',
        slug: slug,
        primary_color: '#3b82f6',
      }
    ])
    .select()
    .single();

  if (orgError) {
    console.error('Error creating org:', orgError);
    return;
  }
  
  console.log('Created test distributor:', org.id);
  
  // 3. We also need an entry in `companies` since the fallback routing might expect it to exist as a distributor there
  const { data: compExisting } = await supabase
    .from('companies')
    .select('id')
    .eq('slug', slug)
    .maybeSingle();
    
  if (!compExisting) {
      await supabase.from('companies').insert([{
          name: 'Distribuidora Teste',
          slug: slug,
          type: 'distribuidora',
          // we might need user_id, but for test maybe we can leave it null or pick a random one?
          // let's try just basic info
      }]);
      console.log('Created fallback company record.');
  }

  console.log('Done!');
}

run();
