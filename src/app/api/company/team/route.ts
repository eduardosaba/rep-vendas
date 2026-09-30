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
  organization_id?: string | null;
  slug?: string | null;
  email?: string | null;
  phone?: string | null;
  full_name?: string | null;
  commission_rate?: number | null;
  can_manage_catalog?: boolean | null;
};

type TeamMetricsByMember = {
  month_sales: number;
  month_commission: number;
  month_orders: number;
};

function normalizeSlug(value: string) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_-]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function isInvalidUserRoleEnumError(error: any) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return code === '22P02' || message.includes('invalid input value for enum user_role');
}

function isMissingColumnError(error: any) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return code === '42703' || (message.includes('column') && message.includes('does not exist'));
}

function extractMissingColumnName(error: any): string | null {
  const msg = String(error?.message || '');
  const quoted = msg.match(/column\s+"([^"]+)"\s+(?:of\s+relation\s+"[^"]+"\s+)?does\s+not\s+exist/i);
  if (quoted?.[1]) return quoted[1];
  return null;
}

async function getRequesterProfile() {
  const supabase = await createClient();
  const authRes = await supabase.auth.getUser();
  const user = authRes?.data?.user;
  if (!user) {
    return { error: NextResponse.json({ success: false, error: 'Não autenticado' }, { status: 401 }) };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,role,company_id,organization_id,can_manage_catalog,slug,email,full_name')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>();

  if (error || !profile) {
    return {
      error: NextResponse.json(
        { success: false, error: error?.message || 'Perfil não encontrado' },
        { status: 403 }
      ),
    };
  }

  return { user, profile };
}

function canManageTeam(profile: ProfileRow) {
  const role = String(profile.role || '');
  return (
    role === 'admin_company' ||
    role === 'master' ||
    ((role === 'representative' || role === 'rep') && Boolean(profile.company_id))
  );
}

function isNativeAdminRole(role: string | null | undefined) {
  const normalized = String(role || '');
  return normalized === 'master' || normalized === 'admin_company';
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const checkSlug = searchParams.get('slug');

    if (checkSlug) {
      const normalized = normalizeSlug(checkSlug);
      if (!normalized) {
        return NextResponse.json({ success: true, available: true });
      }

      const { data: profileSlug } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('slug', normalized)
        .maybeSingle();

      const { data: catalogSlug } = await supabaseAdmin
        .from('public_catalogs')
        .select('id')
        .eq('catalog_slug', normalized)
        .maybeSingle();

      const available = !profileSlug?.id && !catalogSlug?.id;
      return NextResponse.json({ success: true, available });
    }

    const requester = await getRequesterProfile();
    if ('error' in requester) return requester.error;

    const { profile } = requester;
    if (!canManageTeam(profile)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (!profile.company_id) {
      return NextResponse.json({ success: false, error: 'No company linked' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id,full_name,email,phone,slug,role,company_id,commission_rate,can_manage_catalog,created_at')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: true });

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const members = (data || []) as Array<ProfileRow & { created_at?: string | null }>;
    const memberIds = members.map((m) => m.id).filter(Boolean);

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

    const metricsByMember = new Map<string, TeamMetricsByMember>();
    memberIds.forEach((id) => {
      metricsByMember.set(id, {
        month_sales: 0,
        month_commission: 0,
        month_orders: 0,
      });
    });

    let monthSalesTotal = 0;
    let monthCommissionTotal = 0;

    if (memberIds.length > 0) {
      const { data: monthOrders, error: monthOrdersError } = await supabaseAdmin
        .from('orders')
        .select('id,seller_id,total_value,status,created_at')
        .eq('company_id', profile.company_id)
        .gte('created_at', monthStart)
        .in('seller_id', memberIds as string[]);

      if (!monthOrdersError && Array.isArray(monthOrders)) {
        const orderSellerMap = new Map<string, string>();
        const orderIds: string[] = [];

        for (const order of monthOrders as any[]) {
          const sellerId = String(order?.seller_id || '');
          if (!sellerId || !metricsByMember.has(sellerId)) continue;

          const statusText = String(order?.status || '').toLowerCase();
          if (statusText.includes('cancel')) continue;

          const totalValue = Number(order?.total_value || 0);
          const current = metricsByMember.get(sellerId)!;
          current.month_sales += totalValue;
          current.month_orders += 1;

          monthSalesTotal += totalValue;

          const orderId = String(order?.id || '');
          if (orderId) {
            orderIds.push(orderId);
            orderSellerMap.set(orderId, sellerId);
          }
        }

        if (orderIds.length > 0) {
          const { data: commissionsRows, error: commissionsError } = await supabaseAdmin
            .from('commissions')
            .select('order_id,amount')
            .in('order_id', orderIds);

          if (!commissionsError && Array.isArray(commissionsRows)) {
            for (const row of commissionsRows as any[]) {
              const orderId = String(row?.order_id || '');
              const sellerId = orderSellerMap.get(orderId);
              if (!sellerId) continue;
              const amount = Number(row?.amount || 0);
              const current = metricsByMember.get(sellerId);
              if (!current) continue;
              current.month_commission += amount;
            }
          }
        }

        // Fallback por percentual para casos sem linha em commissions
        for (const member of members) {
          const current = metricsByMember.get(member.id);
          if (!current) continue;
          if (current.month_commission > 0) continue;

          const commissionRate = Number(member.commission_rate || 0);
          if (commissionRate > 0) {
            current.month_commission = (current.month_sales * commissionRate) / 100;
          }
        }

        monthCommissionTotal = Array.from(metricsByMember.values()).reduce(
          (acc, item) => acc + Number(item.month_commission || 0),
          0
        );
      }
    }

    const catalogMap = new Map<string, { is_active?: boolean; catalog_slug?: string }>();
    if (memberIds.length > 0) {
      const { data: catRows } = await supabaseAdmin
        .from('public_catalogs')
        .select('user_id, is_active, catalog_slug')
        .in('user_id', memberIds);

      (catRows || []).forEach((c: any) => {
        catalogMap.set(c.user_id, c);
      });
    }

    const enrichedMembers = members.map((m) => {
      const cat = catalogMap.get(m.id);
      return {
        ...m,
        slug: m.slug || cat?.catalog_slug || null,
        is_active: typeof cat?.is_active === 'boolean' ? cat.is_active : true,
      };
    });

    const byMember: Record<string, TeamMetricsByMember> = {};
    for (const [memberId, payload] of metricsByMember.entries()) {
      byMember[memberId] = payload;
    }

    return NextResponse.json({
      success: true,
      data: enrichedMembers,
      metrics: {
        period_start: monthStart,
        month_sales_total: monthSalesTotal,
        month_commission_total: monthCommissionTotal,
        by_member: byMember,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const requester = await getRequesterProfile();
    if ('error' in requester) return requester.error;

    const { user, profile } = requester;
    if (!canManageTeam(profile)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (!profile.company_id) {
      return NextResponse.json({ success: false, error: 'No company linked' }, { status: 400 });
    }

    const body = await req.json();
    const targetUserId = String(body?.target_user_id || body?.id || '').trim();

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: 'target_user_id required' }, { status: 400 });
    }

    if (targetUserId === user.id) {
      return NextResponse.json(
        { success: false, error: 'Você não pode alterar suas próprias permissões nesta tela' },
        { status: 400 }
      );
    }

    const { data: target, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id,company_id,role,slug,email,full_name,phone')
      .eq('id', targetUserId)
      .maybeSingle<ProfileRow>();

    if (targetError || !target) {
      return NextResponse.json(
        { success: false, error: targetError?.message || 'Usuário alvo não encontrado' },
        { status: 404 }
      );
    }

    if (target.company_id !== profile.company_id) {
      return NextResponse.json({ success: false, error: 'Usuário não pertence à sua empresa' }, { status: 403 });
    }

    if (isNativeAdminRole(target.role) && profile.role !== 'master') {
      return NextResponse.json(
        { success: false, error: 'Não é permitido alterar administradores da empresa por esta tela' },
        { status: 403 }
      );
    }

    const updateProfilePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    // 1. Atualização de Nome
    if (typeof body.full_name === 'string' && body.full_name.trim()) {
      const newFullName = body.full_name.trim();
      updateProfilePayload.full_name = newFullName;

      try {
        await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
          user_metadata: { name: newFullName },
        });
      } catch (authErr) {
        console.warn('[PATCH /api/company/team] Falha ao atualizar nome no Auth:', authErr);
      }

      await supabaseAdmin
        .from('settings')
        .update({ representative_name: newFullName, updated_at: new Date().toISOString() })
        .eq('user_id', targetUserId);

      await supabaseAdmin
        .from('public_catalogs')
        .update({ representative_name: newFullName, updated_at: new Date().toISOString() })
        .eq('user_id', targetUserId);
    }

    // 2. Atualização de Telefone
    if (typeof body.phone !== 'undefined') {
      const newPhone = String(body.phone || '').trim();
      updateProfilePayload.phone = newPhone || null;

      const waUrl = newPhone ? `https://wa.me/${newPhone.replace(/\D/g, '')}` : null;
      await supabaseAdmin
        .from('settings')
        .update({ phone: newPhone || null, whatsapp_url: waUrl, updated_at: new Date().toISOString() })
        .eq('user_id', targetUserId);

      await supabaseAdmin
        .from('public_catalogs')
        .update({ phone: newPhone || null, updated_at: new Date().toISOString() })
        .eq('user_id', targetUserId);
    }

    // 3. Atualização de Slug
    if (typeof body.slug === 'string' && body.slug.trim()) {
      const candidateSlug = normalizeSlug(body.slug);
      if (candidateSlug && candidateSlug !== target.slug) {
        // Valida unicidade
        const { data: profileCollision } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('slug', candidateSlug)
          .neq('id', targetUserId)
          .maybeSingle();

        const { data: catalogCollision } = await supabaseAdmin
          .from('public_catalogs')
          .select('id')
          .eq('catalog_slug', candidateSlug)
          .neq('user_id', targetUserId)
          .maybeSingle();

        if (profileCollision?.id || catalogCollision?.id) {
          return NextResponse.json(
            { success: false, error: 'O slug informado já está em uso por outro usuário.' },
            { status: 409 }
          );
        }

        updateProfilePayload.slug = candidateSlug;

        await supabaseAdmin
          .from('settings')
          .update({ catalog_slug: candidateSlug, updated_at: new Date().toISOString() })
          .eq('user_id', targetUserId);

        await supabaseAdmin
          .from('public_catalogs')
          .update({ catalog_slug: candidateSlug, updated_at: new Date().toISOString() })
          .eq('user_id', targetUserId);
      }
    }

    // 4. Permissão do Catálogo
    if (typeof body.can_manage_catalog === 'boolean') {
      updateProfilePayload.can_manage_catalog = body.can_manage_catalog;
    }

    // 5. Comissão
    if (typeof body.commission_rate !== 'undefined' && body.commission_rate !== null) {
      const cr = Number(body.commission_rate);
      if (!Number.isFinite(cr) || cr < 0 || cr > 100) {
        return NextResponse.json({ success: false, error: 'Taxa de comissão inválida (deve ser entre 0 e 100)' }, { status: 400 });
      }
      updateProfilePayload.commission_rate = cr;
    }

    // 6. Status Ativo/Inativo
    if (typeof body.is_active === 'boolean') {
      const isActive = body.is_active;
      await supabaseAdmin
        .from('public_catalogs')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('user_id', targetUserId);

      await supabaseAdmin
        .from('settings')
        .update({ is_active: isActive, updated_at: new Date().toISOString() })
        .eq('user_id', targetUserId);

      // Tenta persistir status em profiles
      try {
        await supabaseAdmin
          .from('profiles')
          .update({ status: isActive ? 'active' : 'inactive' })
          .eq('id', targetUserId);
      } catch {}
    }

    // 7. Redefinição de Senha
    if (typeof body.password === 'string' && body.password.trim()) {
      const newPassword = body.password.trim();
      if (newPassword.length < 8) {
        return NextResponse.json(
          { success: false, error: 'A nova senha precisa ter ao menos 8 caracteres' },
          { status: 400 }
        );
      }

      const { error: pwdError } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, {
        password: newPassword,
      });

      if (pwdError) {
        return NextResponse.json(
          { success: false, error: `Falha ao redefinir senha: ${pwdError.message}` },
          { status: 500 }
        );
      }
    }

    // 8. Sincronizar catálogo / identidade visual completa da distribuidora
    if (body.sync_catalog) {
      const targetOrgId = profile.organization_id || profile.company_id;
      let compData: any = null;
      if (profile.company_id) {
        const { data: c } = await supabaseAdmin.from('companies').select('*').eq('id', profile.company_id).maybeSingle();
        compData = c;
      }

      let distSettings: any = null;
      const { data: s } = await supabaseAdmin.from('settings').select('*').eq('user_id', user.id).maybeSingle();
      distSettings = s;
      if (!distSettings && targetOrgId) {
        const { data: os } = await supabaseAdmin.from('settings').select('*').eq('organization_id', targetOrgId).limit(1).maybeSingle();
        distSettings = os;
      }

      let distCatalog: any = null;
      const { data: pc } = await supabaseAdmin.from('public_catalogs').select('*').eq('user_id', user.id).maybeSingle();
      distCatalog = pc;

      const resolvedLogo = distSettings?.logo_url || compData?.logo_url || distCatalog?.logo_url || null;
      const resolvedPrimary = distSettings?.primary_color || compData?.primary_color || distCatalog?.primary_color || '#2563eb';
      const resolvedSecondary = distSettings?.secondary_color || compData?.secondary_color || distCatalog?.secondary_color || '#0f172a';
      const resolvedBanners = (distSettings?.banners?.length ? distSettings.banners : compData?.banners?.length ? compData.banners : distCatalog?.banners) || [];
      const resolvedBannersMobile = (distSettings?.banners_mobile?.length ? distSettings.banners_mobile : compData?.banners_mobile?.length ? compData.banners_mobile : distCatalog?.banners_mobile) || [];
      const resolvedStoreName = compData?.name || distSettings?.name || distCatalog?.store_name || 'Catálogo Virtual';
      const resolvedHeadline = distSettings?.headline || compData?.headline || distCatalog?.headline || null;
      const resolvedAboutText = distSettings?.about_text || compData?.about_text || compData?.welcome_text || distCatalog?.about_text || null;
      const resolvedFooterMessage = distSettings?.footer_message || compData?.footer_message || distCatalog?.footer_message || null;
      const resolvedFontFamily = distSettings?.font_family || compData?.font_family || distCatalog?.font_family || null;

      await supabaseAdmin.from('settings').update({
        logo_url: resolvedLogo,
        name: resolvedStoreName,
        primary_color: resolvedPrimary,
        secondary_color: resolvedSecondary,
        banners: resolvedBanners,
        banners_mobile: resolvedBannersMobile,
        headline: resolvedHeadline,
        about_text: resolvedAboutText,
        footer_message: resolvedFooterMessage,
        font_family: resolvedFontFamily,
        price_unlock_mode: distSettings?.price_unlock_mode || 'modal',
        price_password_hash: distSettings?.price_password_hash || null,
        show_sale_price: distSettings?.show_sale_price ?? true,
        show_cost_price: distSettings?.show_cost_price ?? false,
        updated_at: new Date().toISOString(),
      }).eq('user_id', targetUserId);

      await supabaseAdmin.from('public_catalogs').update({
        store_name: resolvedStoreName,
        logo_url: resolvedLogo,
        single_brand_logo_url: resolvedLogo,
        primary_color: resolvedPrimary,
        secondary_color: resolvedSecondary,
        banners: resolvedBanners,
        banners_mobile: resolvedBannersMobile,
        headline: resolvedHeadline,
        about_text: resolvedAboutText,
        footer_message: resolvedFooterMessage,
        font_family: resolvedFontFamily,
        price_unlock_mode: distSettings?.price_unlock_mode || distCatalog?.price_unlock_mode || 'modal',
        price_password_hash: distSettings?.price_password_hash || distCatalog?.price_password_hash || null,
        show_sale_price: distSettings?.show_sale_price ?? distCatalog?.show_sale_price ?? true,
        show_cost_price: distSettings?.show_cost_price ?? distCatalog?.show_cost_price ?? false,
        updated_at: new Date().toISOString(),
      }).eq('user_id', targetUserId);
    }

    // Aplica alterações na tabela profiles
    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from('profiles')
      .update(updateProfilePayload)
      .eq('id', targetUserId)
      .eq('company_id', profile.company_id)
      .select('id,full_name,email,phone,slug,role,company_id,can_manage_catalog,commission_rate')
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: updatedProfile });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const requester = await getRequesterProfile();
    if ('error' in requester) return requester.error;

    const { user, profile } = requester;
    if (!canManageTeam(profile)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (!profile.company_id) {
      return NextResponse.json({ success: false, error: 'No company linked' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    let targetUserId = searchParams.get('id') || searchParams.get('target_user_id');

    if (!targetUserId) {
      try {
        const body = await req.json();
        targetUserId = body?.target_user_id || body?.id;
      } catch {}
    }

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: 'target_user_id required' }, { status: 400 });
    }

    if (targetUserId === user.id) {
      return NextResponse.json(
        { success: false, error: 'Você não pode excluir sua própria conta nesta tela' },
        { status: 400 }
      );
    }

    const { data: target, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id,company_id,role,full_name')
      .eq('id', targetUserId)
      .maybeSingle<ProfileRow>();

    if (targetError || !target) {
      return NextResponse.json(
        { success: false, error: targetError?.message || 'Representante não encontrado' },
        { status: 404 }
      );
    }

    if (target.company_id !== profile.company_id) {
      return NextResponse.json({ success: false, error: 'Usuário não pertence à sua distribuidora' }, { status: 403 });
    }

    if (isNativeAdminRole(target.role) && profile.role !== 'master') {
      return NextResponse.json(
        { success: false, error: 'Não é permitido excluir administradores da empresa' },
        { status: 403 }
      );
    }

    // Exclusão / Desvinculação em cascata
    // 1. Remover public_catalogs
    await supabaseAdmin.from('public_catalogs').delete().eq('user_id', targetUserId);

    // 2. Remover settings
    await supabaseAdmin.from('settings').delete().eq('user_id', targetUserId);

    // 3. Remover organization_members se houver
    try {
      await supabaseAdmin.from('organization_members').delete().eq('user_id', targetUserId);
    } catch {}

    // 4. Remover de profiles
    await supabaseAdmin.from('profiles').delete().eq('id', targetUserId);

    // 5. Excluir do Supabase Auth
    try {
      await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    } catch (authDelErr: any) {
      console.warn('[DELETE /api/company/team] Falha ao deletar auth user:', authDelErr?.message);
    }

    return NextResponse.json({ success: true, message: 'Representante excluído com sucesso' });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const requester = await getRequesterProfile();
    if ('error' in requester) return requester.error;

    const { profile } = requester;
    if (!canManageTeam(profile)) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    if (!profile.company_id) {
      return NextResponse.json({ success: false, error: 'No company linked' }, { status: 400 });
    }

    const body = await req.json();
    const fullName = String(body?.full_name || '').trim();
    const email = String(body?.email || '').trim().toLowerCase();
    const phone = String(body?.phone || '').trim();
    const password = String(body?.password || '');
    const slugInput = normalizeSlug(String(body?.slug || ''));
    const finalSlug = slugInput || normalizeSlug(fullName);
    const commissionPercent = Number(body?.commission_percent ?? 5);

    if (!fullName || !email || !password) {
      return NextResponse.json(
        { success: false, error: 'full_name, email e password são obrigatórios' },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'A senha provisória precisa ter ao menos 8 caracteres' },
        { status: 400 }
      );
    }

    if (finalSlug) {
      const { data: existingProfileSlug } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('slug', finalSlug)
        .maybeSingle();

      const { data: existingCatalogSlug } = await supabaseAdmin
        .from('public_catalogs')
        .select('id')
        .eq('catalog_slug', finalSlug)
        .maybeSingle();

      if (existingProfileSlug?.id || existingCatalogSlug?.id) {
        return NextResponse.json(
          { success: false, error: 'Slug já está em uso por outro usuário' },
          { status: 409 }
        );
      }
    }

    const { data: existingEmail } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingEmail?.id) {
      return NextResponse.json(
        { success: false, error: 'Já existe um usuário com este e-mail' },
        { status: 409 }
      );
    }

    const { data: createdAuth, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        name: fullName,
        role: 'representative',
        company_id: profile.company_id,
        phone: phone || undefined,
      },
    });

    if (authError || !createdAuth?.user?.id) {
      return NextResponse.json(
        { success: false, error: authError?.message || 'Erro ao criar usuário no Auth' },
        { status: 500 }
      );
    }

    const authUserId = createdAuth.user.id;
    const targetOrgId = profile.organization_id || profile.company_id;

    try {
      const roleCandidates = ['representative', 'rep'] as const;
      let selectedRole: string | null = null;
      let lastRoleError: any = null;

      for (const roleCandidate of roleCandidates) {
        const profilePayload: Record<string, any> = {
          id: authUserId,
          full_name: fullName,
          email,
          phone: phone || null,
          role: roleCandidate,
          company_id: profile.company_id,
          organization_id: targetOrgId,
          status: 'active',
          can_manage_catalog: true,
          onboarding_completed: true,
          onboarding_step: 4,
          onboarding_completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };

        if (finalSlug) profilePayload.slug = finalSlug;
        if (Number.isFinite(commissionPercent)) profilePayload.commission_rate = commissionPercent;

        for (let attempts = 0; attempts < 8; attempts++) {
          const { error: profileError } = await supabaseAdmin
            .from('profiles')
            .upsert(profilePayload, { onConflict: 'id' });

          if (!profileError) {
            selectedRole = roleCandidate;
            lastRoleError = null;
            break;
          }

          if (isInvalidUserRoleEnumError(profileError)) {
            lastRoleError = profileError;
            break;
          }

          if (isMissingColumnError(profileError)) {
            const missingColumn = extractMissingColumnName(profileError);
            if (missingColumn && missingColumn in profilePayload) {
              delete profilePayload[missingColumn];
              continue;
            }
          }

          throw profileError;
        }

        if (selectedRole) break;
      }

      if (!selectedRole) {
        throw new Error(
          lastRoleError?.message ||
            'Não foi possível aplicar uma role compatível para o representante'
        );
      }

      // Clona identidade visual e configurações da distribuidora para o representante
      let baseSettings: any = null;
      const { data: distSettings } = await supabaseAdmin
        .from('settings')
        .select('*')
        .eq('user_id', requester.user.id)
        .maybeSingle();

      baseSettings = distSettings;

      if (!baseSettings && targetOrgId) {
        const { data: orgSettings } = await supabaseAdmin
          .from('settings')
          .select('*')
          .eq('organization_id', targetOrgId)
          .limit(1)
          .maybeSingle();
        baseSettings = orgSettings || null;
      }

      let companyData: any = null;
      if (profile.company_id) {
        const { data: comp } = await supabaseAdmin
          .from('companies')
          .select('*')
          .eq('id', profile.company_id)
          .maybeSingle();
        companyData = comp || null;
      }

      let distCatalog: any = null;
      const { data: cat } = await supabaseAdmin
        .from('public_catalogs')
        .select('*')
        .eq('user_id', requester.user.id)
        .maybeSingle();
      distCatalog = cat || null;

      // Unifica identidade visual da distribuidora (companies + settings + public_catalogs)
      const resolvedLogo = baseSettings?.logo_url || companyData?.logo_url || distCatalog?.logo_url || null;
      const resolvedPrimaryColor = baseSettings?.primary_color || companyData?.primary_color || distCatalog?.primary_color || '#2563eb';
      const resolvedSecondaryColor = baseSettings?.secondary_color || companyData?.secondary_color || distCatalog?.secondary_color || '#0f172a';
      const resolvedBanners = (baseSettings?.banners && baseSettings.banners.length > 0)
        ? baseSettings.banners
        : (companyData?.banners && companyData.banners.length > 0)
        ? companyData.banners
        : distCatalog?.banners || [];
      const resolvedBannersMobile = (baseSettings?.banners_mobile && baseSettings.banners_mobile.length > 0)
        ? baseSettings.banners_mobile
        : (companyData?.banners_mobile && companyData.banners_mobile.length > 0)
        ? companyData.banners_mobile
        : distCatalog?.banners_mobile || [];
      const resolvedStoreName = companyData?.name || baseSettings?.name || distCatalog?.store_name || 'Catálogo Virtual';
      const resolvedHeadline = baseSettings?.headline || companyData?.headline || distCatalog?.headline || null;
      const resolvedAboutText = baseSettings?.about_text || companyData?.about_text || companyData?.welcome_text || distCatalog?.about_text || null;
      const resolvedFooterMessage = baseSettings?.footer_message || companyData?.footer_message || distCatalog?.footer_message || null;
      const resolvedFontFamily = baseSettings?.font_family || companyData?.font_family || distCatalog?.font_family || null;

      // 1. Salvar configurações clonadas em public.settings
      const settingsPayload: Record<string, any> = {
        ...(baseSettings || {}),
        user_id: authUserId,
        catalog_slug: finalSlug || null,
        name: resolvedStoreName,
        representative_name: fullName,
        email: email,
        phone: phone || null,
        whatsapp_url: phone ? `https://wa.me/${phone.replace(/\D/g, '')}` : (baseSettings?.whatsapp_url || null),
        logo_url: resolvedLogo,
        primary_color: resolvedPrimaryColor,
        secondary_color: resolvedSecondaryColor,
        banners: resolvedBanners,
        banners_mobile: resolvedBannersMobile,
        headline: resolvedHeadline,
        about_text: resolvedAboutText,
        footer_message: resolvedFooterMessage,
        font_family: resolvedFontFamily,
        company_id: profile.company_id,
        organization_id: targetOrgId,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      delete settingsPayload.id;
      delete settingsPayload.created_at;

      for (let attempts = 0; attempts < 8; attempts++) {
        const { error: settingsError } = await supabaseAdmin
          .from('settings')
          .upsert(settingsPayload, { onConflict: 'user_id' });

        if (!settingsError) break;

        if (isMissingColumnError(settingsError)) {
          const missingColumn = extractMissingColumnName(settingsError);
          if (missingColumn && missingColumn in settingsPayload) {
            delete settingsPayload[missingColumn];
            continue;
          }
        }
        console.warn('[POST /api/company/team] Aviso ao clonar settings:', settingsError?.message);
        break;
      }

      // 2. Salvar catálogo público clonado em public.public_catalogs
      const catalogPayload: Record<string, any> = {
        ...(distCatalog || {}),
        user_id: authUserId,
        catalog_slug: finalSlug || null,
        store_name: resolvedStoreName,
        representative_name: fullName,
        email: email,
        phone: phone || null,
        logo_url: resolvedLogo,
        single_brand_logo_url: resolvedLogo,
        primary_color: resolvedPrimaryColor,
        secondary_color: resolvedSecondaryColor,
        banners: resolvedBanners,
        banners_mobile: resolvedBannersMobile,
        headline: resolvedHeadline,
        about_text: resolvedAboutText,
        footer_message: resolvedFooterMessage,
        font_family: resolvedFontFamily,
        company_id: profile.company_id,
        organization_id: targetOrgId,
        is_active: true,
        updated_at: new Date().toISOString(),
      };
      delete catalogPayload.id;
      delete catalogPayload.created_at;

      if (baseSettings) {
        if (!catalogPayload.price_unlock_mode && baseSettings.price_unlock_mode) catalogPayload.price_unlock_mode = baseSettings.price_unlock_mode;
        if (!catalogPayload.price_password_hash && baseSettings.price_password_hash) catalogPayload.price_password_hash = baseSettings.price_password_hash;
        if (catalogPayload.show_sale_price == null && baseSettings.show_sale_price != null) {
          catalogPayload.show_sale_price = baseSettings.show_sale_price;
        }
        if (catalogPayload.show_cost_price == null && baseSettings.show_cost_price != null) {
          catalogPayload.show_cost_price = baseSettings.show_cost_price;
        }
      }

      for (let attempts = 0; attempts < 8; attempts++) {
        const { error: catError } = await supabaseAdmin
          .from('public_catalogs')
          .upsert(catalogPayload, { onConflict: 'user_id' });

        if (!catError) break;

        if (isMissingColumnError(catError)) {
          const missingColumn = extractMissingColumnName(catError);
          if (missingColumn && missingColumn in catalogPayload) {
            delete catalogPayload[missingColumn];
            continue;
          }
        }
        console.warn('[POST /api/company/team] Aviso ao clonar public_catalogs:', catError?.message);
        break;
      }

      const { data: createdProfile } = await supabaseAdmin
        .from('profiles')
        .select('id,full_name,email,phone,slug,role,company_id,commission_rate,can_manage_catalog,created_at')
        .eq('id', authUserId)
        .maybeSingle();

      return NextResponse.json({ success: true, data: createdProfile });
    } catch (innerError: any) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUserId);
      } catch {
        // melhor esforço
      }

      return NextResponse.json(
        { success: false, error: innerError?.message || 'Falha ao criar representante' },
        { status: 500 }
      );
    }
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}