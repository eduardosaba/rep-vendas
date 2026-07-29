import { OrganizationRepository } from '@/modules/core/organizations/OrganizationRepository';
import { OrganizationContext } from '@/shared/types/application';
import { OrganizationQueries } from '../queries/OrganizationQueries';
import { OrganizationMapper } from '../mappers/OrganizationMapper';

export class SupabaseOrganizationRepository extends OrganizationRepository {
  constructor(private readonly queries: OrganizationQueries) {
    super();
  }

  async findBySlug(slug: string): Promise<OrganizationContext | null> {
    const row = await this.queries.findBySlug(slug);
    if (!row) return null;
    return OrganizationMapper.toDomain(row);
  }

  async findById(id: string): Promise<OrganizationContext | null> {
    const row = await this.queries.findById(id);
    if (!row) return null;
    return OrganizationMapper.toDomain(row);
  }

  // Not implemented for read-only phase 1.5
  async findAll(): Promise<OrganizationContext[]> {
    throw new Error('Method not implemented.');
  }

  async save(entity: Partial<OrganizationContext>): Promise<OrganizationContext> {
    throw new Error('Method not implemented.');
  }

  async delete(id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
}
