import { SupabaseClient } from '@supabase/supabase-js';
import { OrganizationQueries } from './queries/OrganizationQueries';
import { ProfileQueries } from './queries/ProfileQueries';
import { SupabaseOrganizationRepository } from './repositories/SupabaseOrganizationRepository';
import { SupabaseProfileRepository } from './repositories/SupabaseProfileRepository';
import { SupabaseBrandingRepository } from './repositories/SupabaseBrandingRepository';

export class RepositoryFactory {
  private constructor() {} // Static factory

  static organization(client: SupabaseClient): SupabaseOrganizationRepository {
    const queries = new OrganizationQueries(client);
    return new SupabaseOrganizationRepository(queries);
  }

  static branding(client: SupabaseClient): SupabaseBrandingRepository {
    const queries = new OrganizationQueries(client); // Uses org queries for now
    return new SupabaseBrandingRepository(queries);
  }

  static profile(client: SupabaseClient): SupabaseProfileRepository {
    const queries = new ProfileQueries(client);
    return new SupabaseProfileRepository(queries);
  }
}
