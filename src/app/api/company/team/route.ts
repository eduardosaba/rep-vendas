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
  slug?: string | null;
  email?: string | null;
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
    return { error: NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 }) };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,role,company_id,can_manage_catalog')
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
  return normalized === 'master' || normalized === 'admin_company' || normalized === 'representative' || normalized === 'rep';
}

export async function GET() {
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

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .select('id,full_name,email,slug,role,company_id,commission_rate,can_manage_catalog,created_at')
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

    const byMember: Record<string, TeamMetricsByMember> = {};
    for (const [memberId, payload] of metricsByMember.entries()) {
      byMember[memberId] = payload;
    }

    return NextResponse.json({
      success: true,
      data: members,
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
    const targetUserId = String(body?.target_user_id || '');
    const canManageCatalog = Boolean(body?.can_manage_catalog);
    const commissionRate = body?.commission_rate;

    if (!targetUserId) {
      return NextResponse.json({ success: false, error: 'target_user_id required' }, { status: 400 });
    }

    if (targetUserId === user.id) {
      return NextResponse.json(
        { success: false, error: 'Você não pode alterar sua própria permissão nesta tela' },
        { status: 400 }
      );
    }

    const { data: target, error: targetError } = await supabaseAdmin
      .from('profiles')
      .select('id,company_id,role')
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

    if (isNativeAdminRole(target.role)) {
      return NextResponse.json(
        { success: false, error: 'Perfis administrativos já possuem acesso ao catálogo' },
        { status: 400 }
      );
    }

    const updatePayload: Record<string, any> = { can_manage_catalog: canManageCatalog };
    if (typeof commissionRate !== 'undefined' && commissionRate !== null) {
      const cr = Number(commissionRate);
      if (!Number.isFinite(cr) || cr < 0 || cr > 100) {
        return NextResponse.json({ success: false, error: 'commission_rate inválido' }, { status: 400 });
      }
      updatePayload.commission_rate = cr;
    }

    const { data, error } = await supabaseAdmin
      .from('profiles')
      .update(updatePayload)
      .eq('id', targetUserId)
      .eq('company_id', profile.company_id)
      .select('id,full_name,email,slug,role,company_id,can_manage_catalog,commission_rate')
      .maybeSingle();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
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
    const password = String(body?.password || '');
    const slug = normalizeSlug(String(body?.slug || ''));
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

    if (slug) {
      const { data: existingSlug } = await supabaseAdmin
        .from('profiles')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();

      if (existingSlug?.id) {
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
      },
    });

    if (authError || !createdAuth?.user?.id) {
      return NextResponse.json(
        { success: false, error: authError?.message || 'Erro ao criar usuário no Auth' },
        { status: 500 }
      );
    }

    const authUserId = createdAuth.user.id;

    try {
      const roleCandidates = ['representative', 'rep'] as const;
      let selectedRole: string | null = null;
      let lastRoleError: any = null;

      for (const roleCandidate of roleCandidates) {
        const profilePayload: Record<string, any> = {
          id: authUserId,
          full_name: fullName,
          email,
          role: roleCandidate,
          company_id: profile.company_id,
          status: 'active',
          updated_at: new Date().toISOString(),
        };

        if (slug) profilePayload.slug = slug;
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

      const { data: createdProfile } = await supabaseAdmin
        .from('profiles')
        .select('id,full_name,email,slug,role,company_id,commission_rate,can_manage_catalog,created_at')
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