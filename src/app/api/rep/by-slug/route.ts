import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const slug = url.searchParams.get('slug');
    if (!slug) return NextResponse.json({ success: false, error: 'slug required' }, { status: 400 });

    const supabase = await createClient();
    const { data: profile, error } = await supabase.from('profiles').select('id, company_id, full_name').eq('slug', slug).maybeSingle();
    if (error) return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    if (!profile) return NextResponse.json({ success: false, error: 'not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: profile });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message || String(e) }, { status: 500 });
  }
}
