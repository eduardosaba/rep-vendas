import { Repository } from '@/infrastructure/Repository';
import { BrandingContext } from '@/shared/types/application';
import { OrganizationQueries } from '../queries/OrganizationQueries';
import { OrganizationMapper } from '../mappers/OrganizationMapper';

// We create an abstract base if needed, but for now we implement directly or extend Repository
export abstract class BrandingRepository extends Repository<BrandingContext> {
  abstract findByOrganizationId(orgId: string): Promise<BrandingContext | null>;
}

export class SupabaseBrandingRepository extends BrandingRepository {
  constructor(private readonly queries: OrganizationQueries) {
    super();
  }

  async findByOrganizationId(orgId: string): Promise<BrandingContext | null> {
    const row = await this.queries.findById(orgId);
    if (!row) return null;
    return OrganizationMapper.toBrandingDomain(row);
  }

  // Not implemented for read-only phase 1.5
  async findById(): Promise<BrandingContext | null> { throw new Error('Method not implemented.'); }
  async findAll(): Promise<BrandingContext[]> { throw new Error('Method not implemented.'); }
  async save(): Promise<BrandingContext> { throw new Error('Method not implemented.'); }
  async delete(): Promise<void> { throw new Error('Method not implemented.'); }
}
