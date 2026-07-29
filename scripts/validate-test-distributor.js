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
  console.log('--- DB Validation ---');
  
  const { data: org, error: orgErr } = await supabase
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', 'distribuidora-teste')
    .maybeSingle();
    
  console.log('Organization:', org || orgErr);
  
  if (org?.id) {
    const { data: branding, error: brandErr } = await supabase
      .from('organization_branding')
      .select('*')
      .eq('organization_id', org.id);
      
    console.log('Branding:', branding || brandErr);
    
    const { data: profiles, error: profErr } = await supabase
      .from('profiles')
      .select('id, full_name, organization_id')
      .eq('organization_id', org.id);
      
    console.log('Profiles:', profiles || profErr);
  }
}

run();
