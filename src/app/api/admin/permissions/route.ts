import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteSupabase } from '@/lib/supabaseServer';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const nextCookies = await cookies();
  const supabase = createRouteSupabase(() => nextCookies);
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');

  try {
    let query = supabase.from('role_permissions').select('*');

    // Se passar role, retorna o objeto único daquela role
    if (role) {
      const { data, error } = await query.eq('role', role).maybeSingle();
      if (error) throw error;
      return NextResponse.json(data);
    }

    // Se não passar role (Torre de Controle), retorna a lista de todas as roles
    const { data, error } = await query.order('role', { ascending: true });
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Erro no GET permissions:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const nextCookies = await cookies();
  const supabase = createRouteSupabase(() => nextCookies);
  try {
    const body = await request.json();
    const { role, allowed_tabs, allowed_sidebar_labels, can_manage_catalog } = body;

    if (!role) return NextResponse.json({ error: 'Role é obrigatória' }, { status: 400 });

    // auth check: only master can update
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const profile = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const actingRole = profile?.data?.role ?? null;
    if (actingRole !== 'master') return NextResponse.json({ error: 'Forbidden: only master can update permissions' }, { status: 403 });

    const upsertObj: any = {
      role,
      updated_at: new Date().toISOString(),
    };
    if (Object.prototype.hasOwnProperty.call(body, 'allowed_tabs')) upsertObj.allowed_tabs = allowed_tabs;
    if (Object.prototype.hasOwnProperty.call(body, 'allowed_sidebar_labels')) upsertObj.allowed_sidebar_labels = allowed_sidebar_labels;
    if (Object.prototype.hasOwnProperty.call(body, 'can_manage_catalog')) upsertObj.can_manage_catalog = Boolean(can_manage_catalog);

    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!adminKey) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });

    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      adminKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabaseAdmin.from('role_permissions').upsert([upsertObj], { onConflict: 'role' }).select().single();
    if (error) {
      console.error('Supabase upsert error:', error);
      if (String(error?.message || '').includes('duplicate key value') || String(error?.code) === '23505') {
        return NextResponse.json({ error: 'Duplicate entry exists. Clean duplicates first.' }, { status: 409 });
      }
      return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    }
    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('Erro no POST permissions:', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const nextCookies = await cookies();
  const supabase = createRouteSupabase(() => nextCookies);

  try {
    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    if (!role) return NextResponse.json({ error: 'Role é obrigatória' }, { status: 400 });

    // auth check: only master can delete
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

    const profile = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    const actingRole = profile?.data?.role ?? null;
    if (actingRole !== 'master') return NextResponse.json({ error: 'Forbidden: only master can delete permissions' }, { status: 403 });

    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!adminKey) return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });

    const supabaseAdmin = createSupabaseAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      adminKey,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { data, error } = await supabaseAdmin.from('role_permissions').delete().eq('role', role).select();
    if (error) {
      console.error('Supabase delete error:', error);
      return NextResponse.json({ error: error.message || String(error) }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (err: any) {
    console.error('Erro no DELETE permissions:', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

// Use Node runtime so this file behaves like other admin routes
export const runtime = 'nodejs';
