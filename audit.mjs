import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({path:'.env.local'});

const supabase = createClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL,
 process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function run(){
 const tables = [
  'orders',
  'order_items',
  'clients',
  'customers',
  'optical_clients'
 ];

 for(const table of tables){
  const {data, error} = await supabase
   .from(table)
   .select('*')
   .limit(1);

  console.log('\nTABLE:', table);

  if(error){
   console.log('NOT FOUND:', error.message);
  } else {
   console.log(Object.keys(data?.[0] || {}));
  }
 }
}

run();
