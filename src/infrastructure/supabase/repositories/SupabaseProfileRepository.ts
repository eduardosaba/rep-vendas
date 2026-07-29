import { ProfileRepository } from '@/modules/core/auth/ProfileRepository';
import { RepresentativeContext } from '@/shared/types/application';
import { ProfileQueries } from '../queries/ProfileQueries';
import { ProfileMapper } from '../mappers/ProfileMapper';

export class SupabaseProfileRepository extends ProfileRepository {
  constructor(private readonly queries: ProfileQueries) {
    super();
  }

  async findRepresentativeBySlug(orgId: string, slug: string): Promise<RepresentativeContext | null> {
    const row = await this.queries.findRepresentativeBySlug(slug, orgId);
    if (!row) return null;
    return ProfileMapper.toDomain(row);
  }

  // Not implemented for read-only phase 1.5
  async findById(): Promise<RepresentativeContext | null> { throw new Error('Method not implemented.'); }
  async findAll(): Promise<RepresentativeContext[]> { throw new Error('Method not implemented.'); }
  async save(): Promise<RepresentativeContext> { throw new Error('Method not implemented.'); }
  async delete(): Promise<void> { throw new Error('Method not implemented.'); }
}
