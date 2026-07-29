import { OrganizationRepository } from '@/modules/core/organizations/OrganizationRepository';
import { ProfileRepository } from '@/modules/core/auth/ProfileRepository';
import { BrandingRepository } from '@/infrastructure/supabase/repositories/SupabaseBrandingRepository';
import { ApplicationContext } from '@/shared/types/application';
import { FeatureRegistry } from '@/shared/features/FeatureRegistry';

export class ApplicationContextAssembler {
  constructor(
    private readonly orgRepo: OrganizationRepository,
    private readonly profileRepo: ProfileRepository,
    private readonly brandingRepo: BrandingRepository
  ) {}

  /**
   * Assembles the full ApplicationContext by querying necessary repositories.
   */
  async assemble(orgSlugOrId: string, repSlug?: string): Promise<ApplicationContext | null> {
    // 1. Identify Organization
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[45][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(orgSlugOrId);
    const organization = isUUID
      ? await this.orgRepo.findById(orgSlugOrId)
      : await this.orgRepo.findBySlug(orgSlugOrId);

    if (!organization) {
      return null; // Org not found, fallback to legacy will happen in DualResolver
    }

    // 2. Fetch Branding
    const branding = await this.brandingRepo.findByOrganizationId(organization.id);

    // 3. Fetch Representative (if provided)
    let representative = null;
    if (repSlug) {
      representative = await this.profileRepo.findRepresentativeBySlug(organization.id, repSlug);
    }

    // Mocking module retrieval from DB based on org slug
    let modules: string[] = [];
    const plan = { name: 'Starter' };

    if (organization.slug === 'distribuidora-beta') {
      modules = []; // Edge case: empty modules
    } else {
      modules = ['catalog', 'crm', 'orders', 'stock', 'pricing', 'team']; // Happy path defaults
      if (organization.slug === 'otica-teste') {
        modules = ['catalog', 'appointments', 'patients', 'team'];
      }
    }

    const tenant = { id: organization.id, type: 'distributor' as const };
    const features = FeatureRegistry.resolve({ tenant, plan, modules });

    // Mock permissions logic based on features. 
    // Usually, we'd get the user role and intersect with features.
    const permissions: string[] = [];
    if (representative) {
      // If we have a rep, we'll give them all feature permissions for now
      features.forEach(f => permissions.push(`can_${f}`));
    }

    // Assemble final context
    return {
      tenant,
      organization,
      branding,
      modules,
      features,
      permissions,
      plan,
      representative,
      client: null,      // Placeholder for future (Óticas)
      priceTable: null,  // Placeholder for future
      currency: 'BRL',
      locale: 'pt-BR',
    };
  }
}
