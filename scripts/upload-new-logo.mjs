import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Missing supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function run() {
  const fileBuffer = fs.readFileSync('public/logo1.png');
  console.log('Uploading public/logo1.png (', fileBuffer.length, 'bytes ) to Supabase storage...');

  const { data, error } = await supabase.storage
    .from('logos')
    .upload('logos/logo.png', fileBuffer, {
      contentType: 'image/png',
      upsert: true,
    });

  if (error) {
    console.error('Upload error:', error);
  } else {
    console.log('Successfully uploaded logo to Supabase Storage logos/logos/logo.png:', data);
  }
}

run();
