import { Repository } from '@/infrastructure/Repository';
import { RepresentativeContext } from '@/shared/types/application';

export abstract class ProfileRepository extends Repository<RepresentativeContext> {
  /**
   * Finds a representative profile by its slug within an organization.
   */
  abstract findRepresentativeBySlug(orgId: string, slug: string): Promise<RepresentativeContext | null>;
}
