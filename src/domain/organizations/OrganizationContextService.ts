import { createClient } from '@/lib/supabase/server';
import type {
  Organization,
  OrganizationMember,
  OrganizationContext,
  OrganizationType,
  MemberRole,
  MemberStatus,
  FeatureKey,
} from './types';

export class OrganizationContextService {
  private async getSupabase() {
    return createClient();
  }

  /**
   * Obtém todas as memberships ativas de um usuário
   */
  async getUserMemberships(userId: string): Promise<OrganizationMember[]> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('role', { ascending: true })
      .order('joined_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  /**
   * Valida se usuário tem membership ativa em uma organização específica
   */
  async validateMembership(userId: string, organizationId: string): Promise<OrganizationMember | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('organization_members')
      .select(`
        *,
        organization:organizations(*)
      `)
      .eq('user_id', userId)
      .eq('organization_id', organizationId)
      .eq('status', 'active')
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Obtém organização por slug (para catálogo público)
   */
  async getOrganizationBySlug(slug: string): Promise<Organization | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('slug', slug)
      .eq('status', 'active')
      .eq('is_active', true)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Obtém organização por ID
   */
  async getOrganizationById(id: string): Promise<Organization | null> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', id)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }

  /**
   * Resolve o contexto organizacional completo para um usuário
   * Prioridade: org solicitada > única membership > fallback profile > none
   */
  async resolveOrganizationContext(
    userId: string,
    requestedOrgId?: string
  ): Promise<OrganizationContext> {
    // 1. Se org solicitada, validar membership
    if (requestedOrgId) {
      const membership = await this.validateMembership(userId, requestedOrgId);
      if (membership) {
        return this.buildContext(membership, 'membership');
      }
    }

    // 2. Buscar todas as memberships ativas do usuário
    const memberships = await this.getUserMemberships(userId);

    // 3. Se houver apenas uma membership, selecionar essa membership
    if (memberships.length === 1) {
      return this.buildContext(memberships[0], 'membership');
    }

    // 4. Se houver múltiplas memberships e nenhuma foi solicitada explicitamente:
    // Auto-selecionar a primeira membership como padrão para não deixar o usuário sem organização selecionada,
    // mas incluindo a lista completa de memberships para permitir a troca no header selector.
    if (memberships.length > 1) {
      const defaultMembership = memberships[0];
      const baseContext = this.buildContext(defaultMembership, 'membership');
      return {
        ...baseContext,
        memberships,
      };
    }

    // 5. Fallback: profile.organization_id
    const supabase = await this.getSupabase();
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name, email, organization_id, company_id, role')
      .eq('id', userId)
      .maybeSingle();

    if (profile?.organization_id) {
      const membership = await this.validateMembership(userId, profile.organization_id);
      if (membership) {
        return this.buildContext(membership, 'profile_org');
      }

      const org = await this.getOrganizationById(profile.organization_id);
      if (org) {
        // Auto-cura: Cria a linha em organization_members para sincronizar a RLS e o contexto
        try {
          await supabase.from('organization_members').upsert({
            organization_id: org.id,
            user_id: userId,
            role: profile.role === 'master' ? 'owner' : 'sales_rep',
            status: 'active',
          }, { onConflict: 'organization_id,user_id' });
        } catch (_) {}

        return {
          organizationId: org.id,
          organization: org,
          organizationType: org.organization_type as OrganizationType,
          memberRole: profile.role === 'master' ? 'owner' : 'sales_rep',
          memberStatus: 'active',
          permissions: this.getPermissionsForRole(profile.role === 'master' ? 'owner' : 'sales_rep', org.organization_type as OrganizationType),
          memberships: [],
          fallback: 'profile_org',
        };
      }
    }

    // 6. Fallback legacy: company_id
    if (profile?.company_id) {
      const org = await this.getOrganizationById(profile.company_id);
      if (org) {
        try {
          await supabase.from('organization_members').upsert({
            organization_id: org.id,
            user_id: userId,
            role: profile.role === 'master' ? 'owner' : 'sales_rep',
            status: 'active',
          }, { onConflict: 'organization_id,user_id' });
          await supabase.from('profiles').update({ organization_id: org.id }).eq('id', userId);
        } catch (_) {}

        return {
          organizationId: org.id,
          organization: org,
          organizationType: org.organization_type as OrganizationType,
          memberRole: profile.role === 'master' ? 'owner' : 'sales_rep',
          memberStatus: 'active',
          permissions: this.getPermissionsForRole(profile.role === 'master' ? 'owner' : 'sales_rep', org.organization_type as OrganizationType),
          memberships: [],
          fallback: 'legacy_company',
        };
      }
    }

    // 7. Fallback para usuário Master sem org vinculada: Auto-selecionar a primeira org ativa da plataforma
    if (profile?.role === 'master') {
      const { data: firstOrg } = await supabase
        .from('organizations')
        .select('*')
        .eq('status', 'active')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (firstOrg) {
        return {
          organizationId: firstOrg.id,
          organization: firstOrg,
          organizationType: firstOrg.organization_type as OrganizationType,
          memberRole: 'owner',
          memberStatus: 'active',
          permissions: this.getPermissionsForRole('owner', firstOrg.organization_type as OrganizationType),
          memberships: [],
          fallback: 'profile_org',
        };
      }
    }

    // 8. Auto-Cura para Representantes/Usuários Legados sem Organização:
    // Se o usuário possui produtos ou cadastro legado sem organização vinculada,
    // verifica se existe uma organização da qual ele seja owner_user_id ou auto-cria a organização dele.
    try {
      const { data: existingOrg } = await supabase
        .from('organizations')
        .select('*')
        .eq('owner_user_id', userId)
        .maybeSingle();

      let targetOrg = existingOrg;

      if (!targetOrg) {
        const orgName = profile?.name || (profile?.email ? profile.email.split('@')[0] : 'Minha Organização');
        const orgType: OrganizationType = 'independent_representative';
        targetOrg = await this.createOrganization(orgName, orgType, userId);
      } else {
        await supabase.from('organization_members').upsert({
          organization_id: targetOrg.id,
          user_id: userId,
          role: 'owner',
          status: 'active',
        }, { onConflict: 'organization_id,user_id' });
      }

      if (targetOrg) {
        // Atualiza o perfil e efetua o backfill automático dos produtos do usuário para a nova organização
        await supabase.from('profiles').update({ organization_id: targetOrg.id }).eq('id', userId);
        await supabase.from('products').update({ organization_id: targetOrg.id }).eq('user_id', userId).is('organization_id', null);
        await supabase.from('brands').update({ organization_id: targetOrg.id }).eq('user_id', userId).is('organization_id', null);
        await supabase.from('categories').update({ organization_id: targetOrg.id }).eq('user_id', userId).is('organization_id', null);

        const membership: OrganizationMember = {
          id: `auto-${targetOrg.id}`,
          organization_id: targetOrg.id,
          user_id: userId,
          role: 'owner',
          status: 'active',
          joined_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          organization: targetOrg,
        };

        return this.buildContext(membership, 'profile_org');
      }
    } catch (autoHealError) {
      console.warn('[OrganizationContextService] Erro na auto-cura de organização:', autoHealError);
    }

    // 9. Sem organização
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

  /**
   * Constrói OrganizationContext a partir de membership
   */
  private buildContext(membership: OrganizationMember, fallback: OrganizationContext['fallback']): OrganizationContext {
    const org = membership.organization;
    if (!org) {
      throw new Error('Organization not found in membership');
    }
    const permissions = this.getPermissionsForRole(membership.role, org.organization_type as OrganizationType);

    return {
      organizationId: org.id,
      organization: org,
      organizationType: org.organization_type as OrganizationType,
      memberRole: membership.role,
      memberStatus: membership.status,
      permissions,
      memberships: [membership],
      fallback,
    };
  }

  /**
   * Permissões baseadas em role + organization_type
   */
  private getPermissionsForRole(role: MemberRole, orgType: OrganizationType): string[] {
    const basePermissions: Record<MemberRole, string[]> = {
      owner: ['manage_organization', 'manage_members', 'manage_catalog', 'manage_orders', 'manage_settings', 'view_analytics', 'manage_billing'],
      admin: ['manage_members', 'manage_catalog', 'manage_orders', 'manage_settings', 'view_analytics'],
      sales_rep: ['view_catalog', 'manage_own_orders', 'view_own_clients', 'view_own_analytics'],
      buyer: ['view_catalog', 'create_orders', 'view_own_orders', 'manage_own_profile'],
      operator: ['view_catalog', 'manage_orders', 'view_analytics'],
    };

    const typePermissions: Record<OrganizationType, string[]> = {
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

  /**
   * Verifica se feature flag está habilitada para a organização
   */
  async isFeatureEnabled(organizationId: string, featureKey: FeatureKey): Promise<boolean> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('organization_features')
      .select('enabled')
      .eq('organization_id', organizationId)
      .eq('feature_key', featureKey)
      .single();

    if (error) return false;
    return data?.enabled ?? false;
  }

  /**
   * Alterna feature flag (apenas master ou owner/admin da org)
   */
  async toggleFeatureFlag(
    organizationId: string,
    featureKey: FeatureKey,
    enabled: boolean,
    userId: string
  ): Promise<void> {
    const supabase = await this.getSupabase();
    const { error } = await supabase
      .from('organization_features')
      .upsert({
        organization_id: organizationId,
        feature_key: featureKey,
        enabled,
        activated_at: enabled ? new Date().toISOString() : null,
        activated_by: enabled ? userId : null,
      }, {
        onConflict: 'organization_id,feature_key',
      });

    if (error) throw error;
  }

  /**
   * Cria nova organização com membership owner
   */
  async createOrganization(
    name: string,
    organizationType: OrganizationType,
    ownerUserId: string,
    slug?: string
  ): Promise<Organization> {
    const generatedSlug = slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    
    const supabase = await this.getSupabase();
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug: generatedSlug,
        organization_type: organizationType,
        owner_user_id: ownerUserId,
        status: 'active',
        is_active: true,
        is_public: organizationType !== 'catalog_template',
        can_sell: organizationType === 'distributor' || organizationType === 'independent_representative',
        can_buy: organizationType === 'optical_store',
        can_receive_orders: organizationType === 'distributor',
      })
      .select()
      .single();

    if (orgError) throw orgError;

    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: ownerUserId,
        role: 'owner',
        status: 'active',
      });

    if (memberError) throw memberError;

    return org;
  }

  /**
   * Convida usuário para organização
   */
  async inviteMember(
    organizationId: string,
    userId: string,
    role: MemberRole,
    invitedBy: string
  ): Promise<OrganizationMember> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('organization_members')
      .insert({
        organization_id: organizationId,
        user_id: userId,
        role,
        status: 'invited',
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Atualiza role de member
   */
  async updateMemberRole(
    organizationId: string,
    userId: string,
    role: MemberRole
  ): Promise<void> {
    const supabase = await this.getSupabase();
    const { error } = await supabase
      .from('organization_members')
      .update({ role })
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) throw error;
  }

  /**
   * Remove member da organização
   */
  async removeMember(organizationId: string, userId: string): Promise<void> {
    const supabase = await this.getSupabase();
    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', organizationId)
      .eq('user_id', userId);

    if (error) throw error;
  }
}

// Singleton para uso server-side
let serviceInstance: OrganizationContextService | null = null;

export function getOrganizationContextService(): OrganizationContextService {
  if (!serviceInstance) {
    serviceInstance = new OrganizationContextService();
  }
  return serviceInstance;
}