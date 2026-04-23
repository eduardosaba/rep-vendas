import { NextRequest, NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/server';

const DEFAULT = {
  master: { can_edit_appearance: true, can_manage_catalog: true, can_edit_stock: true, can_edit_institutional: true, can_edit_pages: true, can_sync_settings: true },
  template: { can_edit_appearance: true, can_manage_catalog: true, can_edit_stock: true, can_edit_institutional: true, can_edit_pages: true, can_sync_settings: true },
  admin_company: { can_edit_appearance: true, can_manage_catalog: true, can_edit_stock: true, can_edit_institutional: true, can_edit_pages: true, can_sync_settings: true },
  rep: { can_edit_appearance: true, can_manage_catalog: false, can_edit_stock: false, can_edit_institutional: false, can_edit_pages: false, can_sync_settings: false },
  representative: { can_edit_appearance: false, can_manage_catalog: false, can_edit_stock: false, can_edit_institutional: false, can_edit_pages: false, can_sync_settings: false },
};

export async function GET() {
  try {
    const supabase = await createRouteSupabase();
    // Try to read persisted mapping from role_permissions (single-row storage)
    const { data, error } = await supabase.from('role_permissions').select('role,data').limit(1).maybeSingle();
    if (error) {
      // If table doesn't exist, return default mapping with informative message
      return NextResponse.json({ data: DEFAULT, info: 'default (no persisted table found)' });
    }
    if (!data || !data.data) return NextResponse.json({ data: DEFAULT });
    return NextResponse.json({ data: data.data });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const mapping = payload?.data ?? null;
    if (!mapping) return NextResponse.json({ error: 'Missing data' }, { status: 400 });

    const supabase = await createRouteSupabase();
    // Upsert into role_permissions single row with role='mapping'
    try {
      const up = await supabase.from('role_permissions').upsert([{ role: 'mapping', data: mapping, updated_at: new Date().toISOString() }]);
      if ((up as any).error) throw (up as any).error;
      return NextResponse.json({ success: true });
    } catch (e: any) {
      // Table may not exist; surface a helpful message
      return NextResponse.json({ error: 'Persist failed. Ensure table "role_permissions(role PRIMARY KEY, data jsonb, updated_at timestamptz)" exists in DB.' }, { status: 500 });
    }
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

export const runtime = 'edge';
