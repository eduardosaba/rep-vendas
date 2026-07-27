import { Repository } from '@/infrastructure/Repository';
import { ApplicationContext } from '@/shared/types/application';

export abstract class ApplicationContextRepository extends Repository<ApplicationContext> {
  /**
   * Retrieves the full application context for a given organization and representative.
   * The implementation decides if it uses a single Join query, RPC, or multiple queries.
   */
  abstract getContext(orgSlug: string, repSlug?: string): Promise<ApplicationContext | null>;
}
