import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import fs from 'fs/promises';
import path from 'path';
import { companyPageContentToHtml } from '@/lib/company-page-content';

function isCompanyAdminRole(role: string) {
  return ['admin_company', 'master'].includes(String(role || ''));
}

async function getUserCompanyContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null, error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,role,company_id')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile || !(profile as any).company_id) {
    return { user, profile, error: 'No company linked' };
  }

  return { user, profile: profile as any, error: null };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await getUserCompanyContext(supabase);
    if (ctx.error) {
      return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.error === 'Not authenticated' ? 401 : 403 });
    }

    const { data, error } = await supabase
      .from('company_pages')
      .select('id,title,slug,content,is_active,created_at,updated_at')
      .eq('company_id', ctx.profile.company_id)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return NextResponse.json({ success: true, data: data || [] });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const ctx = await getUserCompanyContext(supabase);
    if (ctx.error) {
      return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.error === 'Not authenticated' ? 401 : 403 });
    }

    if (!isCompanyAdminRole(String(ctx.profile.role || ''))) {
      return NextResponse.json({ success: false, error: 'Only company admins can create pages' }, { status: 403 });
    }

    const body = await req.json();
    const title = String(body?.title || '').trim();
    const rawSlug = String(body?.slug || '').trim().toLowerCase();
    const content =
      typeof body?.content === 'string' || (body?.content && typeof body.content === 'object')
        ? body.content
        : '';
    const isActive = typeof body?.is_active === 'boolean' ? body.is_active : true;

    if (!title) {
      return NextResponse.json({ success: false, error: 'Title is required' }, { status: 400 });
    }

    const slug = rawSlug
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9-\s]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');

    if (!slug) {
      return NextResponse.json({ success: false, error: 'Slug is required' }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('company_pages')
      .insert({
        company_id: ctx.profile.company_id,
        title,
        slug,
        content,
        is_active: isActive,
      })
      .select('id,title,slug,content,is_active,created_at,updated_at')
      .single();

    if (error) throw error;

    // Gerar arquivo estático para pré-visualização/exports (não bloquear resposta)
    (async () => {
      try {
        const outDir = path.join(process.cwd(), 'public', 'generated_pages', String(ctx.profile.company_id));
        await fs.mkdir(outDir, { recursive: true });
        const filePath = path.join(outDir, `${data.slug}.html`);
        const renderedBody = companyPageContentToHtml(data.content, String(data.title || ''));
        const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${String(data.title || '')}</title></head><body>${renderedBody}</body></html>`;
        await fs.writeFile(filePath, html, 'utf8');
      } catch (e) {
        console.warn('Aviso: falha ao escrever arquivo estático de company_pages', e);
      }
    })();

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const supabase = await createClient();
    const ctx = await getUserCompanyContext(supabase);
    if (ctx.error) {
      return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.error === 'Not authenticated' ? 401 : 403 });
    }

    if (!isCompanyAdminRole(String(ctx.profile.role || ''))) {
      return NextResponse.json({ success: false, error: 'Only company admins can edit pages' }, { status: 403 });
    }

    const body = await req.json();
    const id = String(body?.id || '');
    if (!id) return NextResponse.json({ success: false, error: 'Id is required' }, { status: 400 });

    // buscar slug antigo para remover arquivo caso o slug mude
    let oldSlug: string | null = null;
    try {
      const { data: existing } = await supabase
        .from('company_pages')
        .select('slug')
        .eq('id', id)
        .eq('company_id', ctx.profile.company_id)
        .maybeSingle();
      oldSlug = existing?.slug || null;
    } catch (e) {
      oldSlug = null;
    }

    const payload: Record<string, any> = {};
    if (typeof body?.title === 'string') payload.title = body.title.trim();
    if (typeof body?.slug === 'string') {
      payload.slug = String(body.slug)
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9-\s]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-');
    }
    if (typeof body?.content === 'string' || (body?.content && typeof body.content === 'object')) {
      payload.content = body.content;
    }
    if (typeof body?.is_active === 'boolean') payload.is_active = body.is_active;

    const { data, error } = await supabase
      .from('company_pages')
      .update(payload)
      .eq('id', id)
      .eq('company_id', ctx.profile.company_id)
      .select('id,title,slug,content,is_active,created_at,updated_at')
      .single();

    if (error) throw error;

    // Atualizar/gerar arquivo estático e remover antigo se necessário
    (async () => {
      try {
        const outDir = path.join(process.cwd(), 'public', 'generated_pages', String(ctx.profile.company_id));
        await fs.mkdir(outDir, { recursive: true });
        const filePath = path.join(outDir, `${data.slug}.html`);
        const renderedBody = companyPageContentToHtml(data.content, String(data.title || ''));
        const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${String(data.title || '')}</title></head><body>${renderedBody}</body></html>`;
        await fs.writeFile(filePath, html, 'utf8');

        if (oldSlug && oldSlug !== data.slug) {
          try {
            const oldPath = path.join(outDir, `${oldSlug}.html`);
            await fs.unlink(oldPath).catch(() => {});
          } catch (_) {}
        }
      } catch (e) {
        console.warn('Aviso: falha ao atualizar arquivo estático de company_pages', e);
      }
    })();

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient();
    const ctx = await getUserCompanyContext(supabase);
    if (ctx.error) {
      return NextResponse.json({ success: false, error: ctx.error }, { status: ctx.error === 'Not authenticated' ? 401 : 403 });
    }

    if (!isCompanyAdminRole(String(ctx.profile.role || ''))) {
      return NextResponse.json({ success: false, error: 'Only company admins can remove pages' }, { status: 403 });
    }

    const body = await req.json();
    const id = String(body?.id || '');
    if (!id) return NextResponse.json({ success: false, error: 'Id is required' }, { status: 400 });

    // Buscar slug para remover arquivo estático
    let slugToRemove: string | null = null;
    try {
      const { data: existing } = await supabase
        .from('company_pages')
        .select('slug')
        .eq('id', id)
        .eq('company_id', ctx.profile.company_id)
        .maybeSingle();
      slugToRemove = existing?.slug || null;
    } catch (e) {
      slugToRemove = null;
    }

    const { error } = await supabase
      .from('company_pages')
      .delete()
      .eq('id', id)
      .eq('company_id', ctx.profile.company_id);

    if (error) throw error;

    // Remover arquivo estático (não bloquear resposta)
    (async () => {
      try {
        if (!slugToRemove) return;
        const outDir = path.join(process.cwd(), 'public', 'generated_pages', String(ctx.profile.company_id));
        const filePath = path.join(outDir, `${slugToRemove}.html`);
        await fs.unlink(filePath).catch(() => {});
      } catch (e) {
        console.warn('Aviso: falha ao remover arquivo estático de company_pages', e);
      }
    })();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message || String(err) }, { status: 500 });
  }
}
