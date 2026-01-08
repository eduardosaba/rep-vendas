#!/usr/bin/env node
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config();

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ADMIN_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error(
    'Missing Supabase env vars. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_KEY).'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});

const argv = process.argv.slice(2);
if (argv.length === 0) {
  console.log(
    'Usage: node scripts/set-global-font.mjs <FontName|null> [--allow=true|false]'
  );
  console.log(
    'Example: node scripts/set-global-font.mjs "Poppins" --allow=true'
  );
  process.exit(0);
}

const fontName = argv[0] === 'null' ? null : argv[0];
const allowArg = argv.find((a) => a.startsWith('--allow='));
const allow = allowArg ? allowArg.split('=')[1] === 'true' : true;

async function run() {
  try {
    const { data } = await supabase
      .from('global_configs')
      .select('*')
      .maybeSingle();
    if (data && data.id) {
      const { error } = await supabase
        .from('global_configs')
        .update({
          font_family: fontName,
          allow_custom_fonts: allow,
          updated_at: new Date().toISOString(),
        })
        .match({ id: data.id });
      if (error) throw error;
      console.log('Updated global_configs:', {
        font_family: fontName,
        allow_custom_fonts: allow,
      });
    } else {
      const { error } = await supabase
        .from('global_configs')
        .insert({ font_family: fontName, allow_custom_fonts: allow });
      if (error) throw error;
      console.log('Inserted global_configs:', {
        font_family: fontName,
        allow_custom_fonts: allow,
      });
    }
    process.exit(0);
  } catch (err) {
    console.error('Error updating global_configs:', err);
    process.exit(1);
  }
}

run();
