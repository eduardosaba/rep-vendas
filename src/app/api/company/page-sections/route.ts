import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY ou NEXT_PUBLIC_SUPABASE_URL não configurada');
  }

  return createSupabaseAdmin(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function isMissingRelationError(error: any) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return (
    code === '42P01' ||
    message.includes('relation') && message.includes('does not exist') ||
    message.includes('could not find the table')
  );
}

type ProfileRow = {
  id: string;
  role: string | null;
  company_id: string | null;
};

function canManage(profile: ProfileRow) {
  const role = String(profile.role || '').toLowerCase();
  return role === 'admin_company' || role === 'master';
}

async function getRequester() {
  const supabase = await createClient();
  const authRes = await supabase.auth.getUser();
  const user = authRes?.data?.user;
  if (!user) {
    return { error: NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 }) };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,role,company_id')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>();

  if (error || !profile) {
    return {
      error: NextResponse.json(
        { success: false, error: error?.message || 'Profile not found' },
        { status: 403 }
      ),
    };
  }

  if (!canManage(profile)) {
    return { error: NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 }) };
  }

  if (!profile.company_id) {
    return { error: NextResponse.json({ success: false, error: 'No company linked' }, { status: 400 }) };
  }

  return { profile };
}

function normalizeKey(input: string) {
  return String(input || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getRequester();
    if ('error' in requester) return requester.error;

    const { profile } = requester;
    const { data, error } = await supabaseAdmin
      .from('company_page_sections')
      .select('id,company_id,section_key,title,is_active,sort_order,created_at,updated_at')
      .eq('company_id', profile.company_id)
      .order('sort_order', { ascending: true });

    if (error) {
      if (isMissingRelationError(error)) {
        // Fallback para ambientes sem migration aplicada ainda.
        return NextResponse.json({ success: true, data: [] });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getRequester();
    if ('error' in requester) return requester.error;

    const { profile } = requester;
    const body = await req.json();

    const title = String(body?.title || '').trim();
    const sectionKey = normalizeKey(String(body?.section_key || title));

    if (!title) {
      return NextResponse.json({ success: false, error: 'title is required' }, { status: 400 });
    }

    if (!sectionKey) {
      return NextResponse.json({ success: false, error: 'section_key inválida' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('company_page_sections')
      .upsert(
        {
          company_id: profile.company_id,
          section_key: sectionKey,
          title,
          is_active: body?.is_active !== false,
          sort_order: Number.isFinite(Number(body?.sort_order)) ? Number(body.sort_order) : 0,
        },
        { onConflict: 'company_id,section_key' }
      )
      .select('id,company_id,section_key,title,is_active,sort_order,created_at,updated_at')
      .single();

    if (error) {
      if (isMissingRelationError(error)) {
        return NextResponse.json(
          { success: false, error: 'Tabela company_page_sections não existe. Aplique a migration SQL/2026-04-16_create_company_page_sections.sql.' },
          { status: 503 }
        );
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getRequester();
    if ('error' in requester) return requester.error;

    const { profile } = requester;
    const body = await req.json();
    const id = String(body?.id || '');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const updateData: Record<string, any> = {};
    if (typeof body?.title === 'string') updateData.title = body.title.trim();
    if (typeof body?.is_active === 'boolean') updateData.is_active = body.is_active;
    if (Number.isFinite(Number(body?.sort_order))) updateData.sort_order = Number(body.sort_order);

    const { data, error } = await supabaseAdmin
      .from('company_page_sections')
      .update(updateData)
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .select('id,company_id,section_key,title,is_active,sort_order,created_at,updated_at')
      .maybeSingle();

    if (error) {
      if (isMissingRelationError(error)) {
        return NextResponse.json(
          { success: false, error: 'Tabela company_page_sections não existe. Aplique a migration SQL/2026-04-16_create_company_page_sections.sql.' },
          { status: 503 }
        );
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const requester = await getRequester();
    if ('error' in requester) return requester.error;

    const { profile } = requester;
    const body = await req.json();
    const id = String(body?.id || '');

    if (!id) {
      return NextResponse.json({ success: false, error: 'id is required' }, { status: 400 });
    }

    const { error } = await supabaseAdmin
      .from('company_page_sections')
      .delete()
      .eq('id', id)
      .eq('company_id', profile.company_id);

    if (error) {
      if (isMissingRelationError(error)) {
        return NextResponse.json(
          { success: false, error: 'Tabela company_page_sections não existe. Aplique a migration SQL/2026-04-16_create_company_page_sections.sql.' },
          { status: 503 }
        );
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}
