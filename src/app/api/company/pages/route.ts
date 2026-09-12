import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import fs from 'fs/promises';
import path from 'path';
import { companyPageContentToHtml } from '@/lib/company-page-content';
import { isCompanyAdmin, isGlobalAdmin } from '@/lib/auth/roles';

function isCompanyAdminRole(role: string) {
  return isCompanyAdmin(role) || isGlobalAdmin(role);
}

async function getUserCompanyContext(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, profile: null, error: 'Not authenticated' };

  const { data: profile } = await supabase
    .from('profiles')
    .select('id,role,company_id,organization_id,full_name')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) return { user, profile: null, error: 'No profile found' };

  const targetCompanyId = profile.company_id || profile.organization_id;

  if (!targetCompanyId) {
    return { user, profile, error: 'No company linked' };
  }

  // Garantir a existência de registro na tabela companies para evitar violação da FK company_pages_company_id_fkey
  try {
    const { data: existingComp } = await supabase
      .from('companies')
      .select('id')
      .eq('id', targetCompanyId)
      .maybeSingle();

    if (!existingComp) {
      const { data: org } = await supabase
        .from('organizations')
        .select('name, slug, organization_type')
        .eq('id', targetCompanyId)
        .maybeSingle();

      const compName = org?.name || profile.full_name || 'Minha Empresa';
      const compSlug = org?.slug || `company-${String(targetCompanyId).slice(0, 8)}`;
      const compType = org?.organization_type === 'distributor' ? 'distribuidora' : 'representante';

      await supabase.from('companies').upsert(
        {
          id: targetCompanyId,
          user_id: user.id,
          name: compName,
          slug: compSlug,
          type: compType,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    }

    if (!profile.company_id) {
      await supabase
        .from('profiles')
        .update({ company_id: targetCompanyId, updated_at: new Date().toISOString() })
        .eq('id', user.id);
    }
  } catch (syncErr) {
    console.warn('[getUserCompanyContext] Aviso ao sincronizar companies:', syncErr);
  }

  return { user, profile: { ...profile, company_id: targetCompanyId }, error: null };
}

export async function GET() {
  try {
    const supabase = await createClient();
    const ctx = await getUserCompanyContext(supabase);
    if (ctx.error || !ctx.profile) {
      return NextResponse.json({ success: false, error: ctx.error || 'No company linked' }, { status: ctx.error === 'Not authenticated' ? 401 : 403 });
    }

    let query = supabase
      .from('company_pages')
      .select('id,title,slug,content,is_active,created_at,updated_at')
      .order('created_at', { ascending: false });

    const tenantId = ctx.profile.organization_id || ctx.profile.company_id;
    if (ctx.profile.organization_id) {
      query = query.or(`organization_id.eq.${ctx.profile.organization_id},company_id.eq.${ctx.profile.company_id}`);
    } else {
      query = query.eq('company_id', tenantId);
    }

    const { data, error } = await query;

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
    if (ctx.error || !ctx.profile) {
      return NextResponse.json({ success: false, error: ctx.error || 'No company linked' }, { status: ctx.error === 'Not authenticated' ? 401 : 403 });
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

    const RESERVED_SLUGS = ['empresa', 'produtos', 'checkout', 'cart', 'login', 'register', 'sobre', 'admin', 'api', 'dashboard', 'settings', 'catalogo'];
    if (RESERVED_SLUGS.includes(slug)) {
      return NextResponse.json({ success: false, error: `O slug "${slug}" é reservado pelo sistema. Por favor, escolha outro.` }, { status: 400 });
    }

    const insertPayload: any = {
      company_id: ctx.profile.company_id,
      title,
      slug,
      content,
      is_active: isActive,
    };
    if (ctx.profile.organization_id) {
      insertPayload.organization_id = ctx.profile.organization_id;
    }

    const { data, error } = await supabase
      .from('company_pages')
      .insert(insertPayload)
      .select('id,title,slug,content,is_active,created_at,updated_at')
      .single();

    if (error) throw error;

    // Gerar arquivo estático para pré-visualização/exports (não bloquear resposta)
    const companyId = ctx.profile.company_id;
    (async () => {
      try {
        const outDir = path.join(process.cwd(), 'public', 'generated_pages', String(companyId));
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
    if (ctx.error || !ctx.profile) {
      return NextResponse.json({ success: false, error: ctx.error || 'No company linked' }, { status: ctx.error === 'Not authenticated' ? 401 : 403 });
    }

    if (!isCompanyAdminRole(String(ctx.profile.role || ''))) {
      return NextResponse.json({ success: false, error: 'Only company admins can edit pages' }, { status: 403 });
    }

    const body = await req.json();
    const id = String(body?.id || '');
    if (!id) return NextResponse.json({ success: false, error: 'Id is required' }, { status: 400 });

    const companyId = ctx.profile.company_id;

    // buscar slug antigo para remover arquivo caso o slug mude
    let oldSlug: string | null = null;
    try {
      const { data: existing } = await supabase
        .from('company_pages')
        .select('slug')
        .eq('id', id)
        .eq('company_id', companyId)
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
      .eq('company_id', companyId)
      .select('id,title,slug,content,is_active,created_at,updated_at')
      .single();

    if (error) throw error;

    // Atualizar/gerar arquivo estático e remover antigo se necessário
    (async () => {
      try {
        const outDir = path.join(process.cwd(), 'public', 'generated_pages', String(companyId));
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
    if (ctx.error || !ctx.profile) {
      return NextResponse.json({ success: false, error: ctx.error || 'No company linked' }, { status: ctx.error === 'Not authenticated' ? 401 : 403 });
    }

    if (!isCompanyAdminRole(String(ctx.profile.role || ''))) {
      return NextResponse.json({ success: false, error: 'Only company admins can remove pages' }, { status: 403 });
    }

    const body = await req.json();
    const id = String(body?.id || '');
    if (!id) return NextResponse.json({ success: false, error: 'Id is required' }, { status: 400 });

    const companyId = ctx.profile.company_id;

    // Buscar slug para remover arquivo estático
    let slugToRemove: string | null = null;
    try {
      const { data: existing } = await supabase
        .from('company_pages')
        .select('slug')
        .eq('id', id)
        .eq('company_id', companyId)
        .maybeSingle();
      slugToRemove = existing?.slug || null;
    } catch (e) {
      slugToRemove = null;
    }

    const { error } = await supabase
      .from('company_pages')
      .delete()
      .eq('id', id)
      .eq('company_id', companyId);

    if (error) throw error;

    // Remover arquivo estático (não bloquear resposta)
    (async () => {
      try {
        if (!slugToRemove) return;
        const outDir = path.join(process.cwd(), 'public', 'generated_pages', String(companyId));
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
