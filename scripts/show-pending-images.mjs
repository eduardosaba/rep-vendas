#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';

const IDS = [
  '70e74da8-bc96-4565-b517-f48057842fb5',
  'e64e3604-d8f4-4564-99fe-db6e7fd6da52',
  '6ce39cdd-2751-4c7b-8606-2f08f4c6c2d8',
  'a9ccea9c-ffdf-4c08-8f2f-211698c924e0',
  'f74650b2-af25-42f1-9ac9-7ac9bf5c8fe3',
  '7a98653b-b14b-4904-afdb-869becd869d4',
  'ce440ef3-918c-4650-aa1a-da4a1da49ac7',
  'e9da05c1-3d5a-4be3-9d49-c2877c79d231',
  '3059f825-4832-48a4-b018-2718ffcabb79',
  '0374308c-6dcc-438e-9752-60695b5fb9df',
  '0225b873-80f6-4145-b649-b98395157501',
  'ac2f5b75-a39f-4b12-b3bc-185ea102027c',
  'ee65b08c-b6e6-45b9-bb2f-fd3ad0274f03',
  'f87544f5-3c26-409e-bf19-bd586a7e33f7',
  '9810a09b-69d4-471b-80d8-b13ba4a14ed0',
];

const SUPABASE_URL =
  process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Missing SUPABASE env vars');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function run() {
  console.log('Querying pending product_images for 15 products...');
  try {
    const { data, error } = await supabase
      .from('product_images')
      .select(
        'id,product_id,url,optimized_url,storage_path,sync_status,sync_error,created_at'
      )
      .in('product_id', IDS)
      .order('created_at', { ascending: true })
      .limit(1000);

    if (error) throw error;

    if (!data || data.length === 0) {
      console.log('No product_images found for these products.');
      return;
    }

    const grouped = data.reduce((acc, row) => {
      acc[row.product_id] = acc[row.product_id] || [];
      acc[row.product_id].push(row);
      return acc;
    }, {});

    for (const id of IDS) {
      const rows = grouped[id] || [];
      console.log(`\nProduct ${id} -> ${rows.length} product_images:`);
      for (const r of rows) {
        console.log(
          `- ${r.id} | ${r.sync_status} | ${r.storage_path || 'NULL'} | ${r.optimized_url || r.url}`
        );
      }
    }
  } catch (err) {
    console.error('Error querying product_images:', err.message || err);
    process.exit(1);
  }
}

run();
