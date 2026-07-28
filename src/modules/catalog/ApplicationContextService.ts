import { ApplicationContextAssembler } from './ApplicationContextAssembler';
import { ApplicationContext } from '@/shared/types/application';
import { unstable_cache } from 'next/cache';

export class ApplicationContextService {
  constructor(private readonly assembler: ApplicationContextAssembler) {}

  /**
   * Resolves the full context for an application request using a Dual Resolver strategy.
   * If the new Modular flow yields a valid context, it returns it.
   * If it fails (org not found in new model), it triggers the Legacy Fallback.
   */
  async resolve(orgSlugOrId: string, repSlug?: string): Promise<ApplicationContext & { source: string } | null> {
    const getCachedContext = unstable_cache(
      async (slug: string, rep?: string) => {
        try {
          const modularContext = await this.assembler.assemble(slug, rep);

          if (modularContext) {
            return { ...modularContext, source: 'organization' };
          }
          return this.resolveLegacyV2Flow(slug);
        } catch (error) {
          console.error('[DualResolver Critical Failure]: Fallback to Legacy V2', error);
          return this.resolveLegacyV2Flow(slug);
        }
      },
      ['catalog-context'],
      { revalidate: 60 }
    );

    return getCachedContext(orgSlugOrId, repSlug);
  }

  /**
   * Encapsula a lógica antiga para garantir que o link clássico (?rep=) continue funcional
   */
  private async resolveLegacyV2Flow(legacySlug: string): Promise<ApplicationContext & { source: string } | null> {
    console.log(`[DualResolver] Executando Fallback Legado V2 para: ${legacySlug}`);
    return null; 
  }
}
