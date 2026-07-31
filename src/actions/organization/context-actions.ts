'use me' // Note: standard 'use server' directive below
'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { OrganizationContextService } from '@/modules/core/organizations/organization-context-service';
import { 
  UserOrganizationSummary, 
  ActiveOrganizationContext, 
  OrganizationMembershipValidationResult 
} from '@/domain/organizations/types';

const ACTIVE_ORG_COOKIE_NAME = 'repvendas_active_org_id';

/**
 * Server Action para buscar todas as organizações do usuário autenticado.
 */
export async function getUserOrganizationsAction(): Promise<UserOrganizationSummary[]> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) return [];

    const service = new OrganizationContextService(supabase);
    return await service.getUserOrganizations(user.id);
  } catch (error) {
    console.error('[getUserOrganizationsAction] Erro inesperado:', error);
    return [];
  }
}

/**
 * Server Action para trocar a organização ativa do usuário (com validação estrita no servidor).
 */
export async function setActiveOrganizationAction(
  targetOrganizationId: string
): Promise<OrganizationMembershipValidationResult> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { isValid: false, reason: 'Sessão expirada. Efetue login novamente.' };
    }

    // Verifica status de Master da plataforma
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .maybeSingle();

    const isMaster = Boolean(profile?.is_admin || profile?.role === 'master');

    const service = new OrganizationContextService(supabase);
    const validation = await service.validateOrganizationMembership(user.id, targetOrganizationId, isMaster);

    if (!validation.isValid || !validation.organization) {
      return validation;
    }

    // Salva a preferência em Cookie HTTP-only seguro
    const cookieStore = await cookies();
    cookieStore.set(ACTIVE_ORG_COOKIE_NAME, targetOrganizationId, {
      path: '/',
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 dias
    });

    return validation;
  } catch (error: any) {
    console.error('[setActiveOrganizationAction] Erro ao trocar organização:', error);
    return { isValid: false, reason: error?.message || 'Falha ao alterar a organização ativa.' };
  }
}

/**
 * Server Action para obter a organização ativa resolvida no servidor.
 */
export async function getActiveOrganizationAction(): Promise<{
  activeOrganization: ActiveOrganizationContext | null;
  userOrganizations: UserOrganizationSummary[];
  isMaster: boolean;
}> {
  try {
    const supabase = await createClient();
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      return { activeOrganization: null, userOrganizations: [], isMaster: false };
    }

    const cookieStore = await cookies();
    const preferredOrgId = cookieStore.get(ACTIVE_ORG_COOKIE_NAME)?.value || null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin, role')
      .eq('id', user.id)
      .maybeSingle();

    const isMaster = Boolean(profile?.is_admin || profile?.role === 'master');

    const service = new OrganizationContextService(supabase);
    const userOrganizations = await service.getUserOrganizations(user.id);
    const activeOrganization = await service.resolveActiveOrganization(user.id, preferredOrgId, isMaster);

    return {
      activeOrganization,
      userOrganizations,
      isMaster
    };
  } catch (error) {
    console.error('[getActiveOrganizationAction] Erro ao carregar organização ativa:', error);
    return { activeOrganization: null, userOrganizations: [], isMaster: false };
  }
}
