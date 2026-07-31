import { SupabaseClient } from '@supabase/supabase-js';
import { 
  UserOrganizationSummary, 
  ActiveOrganizationContext, 
  OrganizationMembershipValidationResult,
  OrganizationType,
  OrganizationRole
} from '@/domain/organizations/types';

export class OrganizationContextService {
  constructor(private readonly supabase: SupabaseClient) {}

  /**
   * Lista todas as organizações ativas a que o usuário pertence via organization_members.
   */
  async getUserOrganizations(userId: string): Promise<UserOrganizationSummary[]> {
    if (!userId) return [];

    const { data, error } = await this.supabase
      .from('organization_members')
      .select(`
        organization_id,
        role,
        status,
        organizations!inner (
          id,
          name,
          slug,
          organization_type,
          is_active,
          logo_url
        )
      `)
      .eq('user_id', userId)
      .eq('status', 'active');

    if (error || !data) {
      console.error('[OrganizationContextService] Erro ao buscar organizações do usuário:', error);
      return [];
    }

    return data
      .filter((item: any) => item.organizations && item.organizations.is_active !== false)
      .map((item: any) => ({
        id: item.organizations.id,
        name: item.organizations.name,
        slug: item.organizations.slug,
        organization_type: (item.organizations.organization_type || 'independent_representative') as OrganizationType,
        role: item.role as OrganizationRole,
        status: item.status,
        logo_url: item.organizations.logo_url || null,
      }));
  }

  /**
   * Validação Estrita de Segurança no Servidor:
   * Verifica se o usuário pertence ativamente à organização informada.
   */
  async validateOrganizationMembership(
    userId: string, 
    organizationId: string,
    isMasterUser: boolean = false
  ): Promise<OrganizationMembershipValidationResult> {
    if (!userId || !organizationId) {
      return { isValid: false, reason: 'Identificador de usuário ou organização ausente.' };
    }

    // Busca detalhes da organização
    const { data: orgData, error: orgError } = await this.supabase
      .from('organizations')
      .select('id, name, slug, organization_type, is_active')
      .eq('id', organizationId)
      .maybeSingle();

    if (orgError || !orgData || orgData.is_active === false) {
      return { isValid: false, reason: 'Organização não encontrada ou inativa.' };
    }

    // Se for Master da plataforma, permite acesso com papel de administrador
    if (isMasterUser) {
      const activeContext = this.buildActiveContext(orgData, 'admin');
      return { isValid: true, organization: activeContext };
    }

    // Caso contrário, valida associação em organization_members
    const { data: memberData, error: memberError } = await this.supabase
      .from('organization_members')
      .select('role, status')
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .maybeSingle();

    if (memberError || !memberData) {
      return { isValid: false, reason: 'Acesso negado: o usuário não é membro ativo desta organização.' };
    }

    const activeContext = this.buildActiveContext(orgData, memberData.role as OrganizationRole);
    return { isValid: true, organization: activeContext };
  }

  /**
   * Resolve o contexto da organização ativa para uma requisição do usuário.
   */
  async resolveActiveOrganization(
    userId: string,
    preferredOrganizationId?: string | null,
    isMasterUser: boolean = false
  ): Promise<ActiveOrganizationContext | null> {
    const userOrgs = await this.getUserOrganizations(userId);

    if (userOrgs.length === 0 && !isMasterUser) {
      return null;
    }

    // Tenta validar a organização preferida enviada (cookie / header)
    if (preferredOrganizationId) {
      const validation = await this.validateOrganizationMembership(userId, preferredOrganizationId, isMasterUser);
      if (validation.isValid && validation.organization) {
        return validation.organization;
      }
    }

    // Fallback: Retorna a primeira organização disponível do usuário (priorizando 'owner')
    if (userOrgs.length > 0) {
      const primaryOrg = userOrgs.find(o => o.role === 'owner') || userOrgs[0];
      const validation = await this.validateOrganizationMembership(userId, primaryOrg.id, isMasterUser);
      if (validation.isValid && validation.organization) {
        return validation.organization;
      }
    }

    return null;
  }

  /**
   * Constrói as capacidades e regras de negócio para a Organização Ativa.
   */
  private buildActiveContext(orgData: any, role: OrganizationRole): ActiveOrganizationContext {
    const orgType: OrganizationType = (orgData.organization_type || 'independent_representative') as OrganizationType;
    const isTemplateCatalog = orgType === 'catalog_template';

    // Regras de negócio restritivas por tipo de organização
    let canSell = true;
    let canBuy = false;
    let canReceiveOrders = true;
    let isPublic = true;

    if (isTemplateCatalog) {
      // Catálogo Mestre / Biblioteca de Marcas: NÃO vende, NÃO compra, NÃO recebe pedidos
      canSell = false;
      canBuy = false;
      canReceiveOrders = false;
      isPublic = false;
    } else if (orgType === 'optical_store') {
      // Ótica Compradora: Pode comprar de distribuidoras, não vende acervo próprio
      canSell = false;
      canBuy = true;
      canReceiveOrders = false;
    } else if (orgType === 'distributor' || orgType === 'independent_representative') {
      canSell = true;
      canBuy = false;
      canReceiveOrders = true;
    }

    return {
      id: orgData.id,
      name: orgData.name,
      slug: orgData.slug,
      organization_type: orgType,
      role,
      is_active: orgData.is_active !== false,
      is_public: isPublic,
      can_sell: canSell,
      can_buy: canBuy,
      can_receive_orders: canReceiveOrders,
      is_template_catalog: isTemplateCatalog,
    };
  }
}
