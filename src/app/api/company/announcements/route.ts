import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type ProfileRow = {
  id: string;
  role: string | null;
  company_id: string | null;
};

async function getRequesterProfile() {
  const supabase = await createClient();
  const authRes = await supabase.auth.getUser();
  const user = authRes?.data?.user;
  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      ),
    };
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

  return { user, profile };
}

function canManageAnnouncements(profile: ProfileRow) {
  const role = String(profile.role || '');
  const isCompanyMember = Boolean(profile.company_id);
  return (
    role === 'admin_company' ||
    role === 'master' ||
    ((role === 'representative' || role === 'rep') && isCompanyMember)
  );
}

export async function GET(req: Request) {
  try {
    const requester = await getRequesterProfile();
    if ('error' in requester) return requester.error;

    const { profile } = requester;
    if (!profile.company_id) {
      return NextResponse.json(
        { success: false, error: 'No company linked' },
        { status: 400 }
      );
    }

    const { searchParams } = new URL(req.url);
    const publishedOnly = searchParams.get('published') === '1';

    let query = supabaseAdmin
      .from('company_announcements')
      .select('id,title,content,is_published,published_at,created_at,updated_at')
      .eq('company_id', profile.company_id)
      .order('published_at', { ascending: false, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (publishedOnly) {
      query = query.eq('is_published', true);
    }

    const { data, error } = await query;
    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data: data || [] });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const requester = await getRequesterProfile();
    if ('error' in requester) return requester.error;

    const { user, profile } = requester;
    if (!canManageAnnouncements(profile)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (!profile.company_id) {
      return NextResponse.json(
        { success: false, error: 'No company linked' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const title = String(body?.title || '').trim();
    const content = String(body?.content || '').trim();
    const isPublished = body?.is_published !== false;

    if (!title || !content) {
      return NextResponse.json(
        { success: false, error: 'Título e conteúdo são obrigatórios' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('company_announcements')
      .insert({
        company_id: profile.company_id,
        title,
        content,
        is_published: isPublished,
        published_at: isPublished ? nowIso : null,
        created_by: user.id,
      })
      .select('id,title,content,is_published,published_at,created_at,updated_at')
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const requester = await getRequesterProfile();
    if ('error' in requester) return requester.error;

    const { profile } = requester;
    if (!canManageAnnouncements(profile)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (!profile.company_id) {
      return NextResponse.json(
        { success: false, error: 'No company linked' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const id = String(body?.id || '');
    const title = String(body?.title || '').trim();
    const content = String(body?.content || '').trim();
    const isPublished = Boolean(body?.is_published);

    if (!id || !title || !content) {
      return NextResponse.json(
        { success: false, error: 'id, título e conteúdo são obrigatórios' },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();
    const { data, error } = await supabaseAdmin
      .from('company_announcements')
      .update({
        title,
        content,
        is_published: isPublished,
        published_at: isPublished ? nowIso : null,
        updated_at: nowIso,
      })
      .eq('id', id)
      .eq('company_id', profile.company_id)
      .select('id,title,content,is_published,published_at,created_at,updated_at')
      .maybeSingle();

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const requester = await getRequesterProfile();
    if ('error' in requester) return requester.error;

    const { profile } = requester;
    if (!canManageAnnouncements(profile)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (!profile.company_id) {
      return NextResponse.json(
        { success: false, error: 'No company linked' },
        { status: 400 }
      );
    }

    const body = await req.json();
    const id = String(body?.id || '');
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id é obrigatório' },
        { status: 400 }
      );
    }

    const { error } = await supabaseAdmin
      .from('company_announcements')
      .delete()
      .eq('id', id)
      .eq('company_id', profile.company_id);

    if (error) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
