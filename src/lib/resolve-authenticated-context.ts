import { createRouteSupabase } from '@/lib/supabase/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import type { OrganizationContextV2 } from '@/shared/types/application';

/**
 * Resolve organização ativa para rotas AUTENTICADAS (dashboard, admin, etc)
 * NÃO USA PARA /catalogo/* que deve permanecer público
 */
export async function resolveAuthenticatedOrganizationContext(): Promise<OrganizationContextV2 | null> {
  const supabase = await createRouteSupabase();
  const user = await getServerUserFallback();

  if (!user) return null;

  // 1. Verificar cookie active_org_id
  const cookieStore = await import('next/headers').then(m => m.cookies());
  const activeOrgIdFromCookie = cookieStore.get('active_org_id')?.value;

  // 2. Buscar memberships ativas
  const { data: memberships } = await supabase
    .from('organization_members')
    .select(`
      *,
      organization:organizations(*)
    `)
    .eq('user_id', user.id)
    .eq('status', 'active')
    .order('role', { ascending: true })
    .order('joined_at', { ascending: true });

  const activeMemberships = memberships || [];

  // 3. Se org solicitada via cookie, validar
  if (activeOrgIdFromCookie) {
    const membership = activeMemberships.find((m: any) => m.organization_id === activeOrgIdFromCookie);
    if (membership) {
      return buildContext(membership, 'membership');
    }
  }

  // 4. Se apenas uma membership, auto-selecionar
  if (activeMemberships.length === 1) {
    return buildContext(activeMemberships[0], 'membership');
  }

  // 5. Se múltiplas, retornar contexto com lista para seletor
  if (activeMemberships.length > 1) {
    return {
      organizationId: null,
      organization: null,
      organizationType: null,
      memberRole: null,
      memberStatus: null,
      permissions: [],
      memberships: activeMemberships,
      fallback: 'membership',
    };
  }

  // 6. Fallback: profile.organization_id
  if (user.organization_id) {
    const { data: membership } = await supabase
      .from('organization_members')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('user_id', user.id)
      .eq('organization_id', user.organization_id)
      .eq('status', 'active')
      .maybeSingle();

    if (membership) {
      return buildContext(membership, 'profile_org');
    }
  }

  // 7. Fallback legacy: company_id
  if (user.company_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', user.company_id)
      .maybeSingle();

    if (org) {
      return {
        organizationId: org.id,
        organization: org,
        organizationType: org.organization_type,
        memberRole: user.role === 'master' ? 'owner' : 'sales_rep',
        memberStatus: 'active',
        permissions: getPermissionsForRole(user.role === 'master' ? 'owner' : 'sales_rep', org.organization_type),
        memberships: [],
        fallback: 'legacy_company',
      };
    }
  }

  // 8. Sem organização
  return {
    organizationId: null,
    organization: null,
    organizationType: null,
    memberRole: null,
    memberStatus: null,
    permissions: [],
    memberships: [],
    fallback: 'none',
  };
}

function buildContext(membership: any, fallback: OrganizationContextV2['fallback']): OrganizationContextV2 {
  const org = membership.organization;
  const permissions = getPermissionsForRole(membership.role, org.organization_type);

  return {
    organizationId: org.id,
    organization: org,
    organizationType: org.organization_type,
    memberRole: membership.role,
    memberStatus: membership.status,
    permissions,
    memberships: [membership],
    fallback,
  };
}

function getPermissionsForRole(role: string, orgType: string): string[] {
  const basePermissions: Record<string, string[]> = {
    owner: ['manage_organization', 'manage_members', 'manage_catalog', 'manage_orders', 'manage_settings', 'view_analytics', 'manage_billing'],
    admin: ['manage_members', 'manage_catalog', 'manage_orders', 'manage_settings', 'view_analytics'],
    sales_rep: ['view_catalog', 'manage_own_orders', 'view_own_clients', 'view_own_analytics'],
    buyer: ['view_catalog', 'create_orders', 'view_own_orders', 'manage_own_profile'],
    operator: ['view_catalog', 'manage_orders', 'view_analytics'],
  };

  const typePermissions: Record<string, string[]> = {
    independent_representative: ['manage_own_catalog', 'manage_own_clients', 'manage_own_orders'],
    distributor: ['manage_catalog', 'manage_team', 'manage_price_tables', 'manage_fulfillment', 'view_all_orders'],
    optical_store: ['view_approved_catalogs', 'create_purchase_orders', 'manage_buyers', 'view_own_orders'],
    catalog_template: ['manage_base_catalog', 'clone_catalog'],
  };

  return [
    ...(basePermissions[role] || []),
    ...(typePermissions[orgType] || []),
  ];
}