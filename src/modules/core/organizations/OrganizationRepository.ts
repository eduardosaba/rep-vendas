import { Repository } from '@/infrastructure/Repository';
import { OrganizationContext } from '@/shared/types/application';

export abstract class OrganizationRepository extends Repository<OrganizationContext> {
  /**
   * Finds an organization by its slug.
   */
  abstract findBySlug(slug: string): Promise<OrganizationContext | null>;
}
