import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function GET() {
  try {
    const supabaseUrl =
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Config missing' }, { status: 500 });
    }

    const supabase = createClient(supabaseUrl, serviceKey);

    // Lista produtos que NÃO têm P00 na capa, são links Safilo e estão pendentes
    const { data, error } = await supabase
      .from('products')
      .select(
        'id, name, brand, image_url, external_image_url, images, sync_status'
      )
      .ilike('image_url', '%safilo%')
      .neq('sync_status', 'synced')
      .not('image_url', 'ilike', '%P00.jpg%')
      .order('created_at', { ascending: false })
      .limit(1000);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    return NextResponse.json({ data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
