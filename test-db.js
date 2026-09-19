const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config({path: '.env.local'});
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
async function run() {
  const { data, error } = await supabase.from('orders').select('*').limit(1);
  if(error) {
    console.error(error);
  } else if(data && data.length > 0) {
    console.log('Columns:', Object.keys(data[0]));
  } else {
    console.log('Table empty');
  }
}
run();
