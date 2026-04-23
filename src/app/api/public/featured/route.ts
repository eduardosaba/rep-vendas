import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ products: [] });
    }

    const admin = createSupabaseAdmin(String(supabaseUrl), String(serviceKey), {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    let query = admin
      .from('products')
      .select('id,name,slug,price,original_price,image_url,image_path,brand')
      .eq('is_destaque', true)
      .eq('is_active', true)
      .order('updated_at', { ascending: false })
      .limit(12);

    // Support both individual catalogs (user_id) and distributor catalogs (company_id)
    query = query.or(`user_id.eq.${userId},company_id.eq.${userId}`);

    const { data, error } = await query;

    if (error) throw error;
    return NextResponse.json({ products: data || [] });
  } catch (err: any) {
    console.error('public/featured error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
