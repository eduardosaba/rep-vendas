import { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://repvendas.com.br';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  // Rotas institucionais e comerciais fixas
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${APP_URL}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${APP_URL}/demo/catalogo`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${APP_URL}/documentacao`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${APP_URL}/suporte`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.6,
    },
    {
      url: `${APP_URL}/termos`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${APP_URL}/privacidade`,
      lastModified: now,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ];

  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;

    if (supabaseUrl && serviceKey) {
      const supabase = createClient(supabaseUrl, serviceKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      // 1. Catálogos Públicos Ativos
      const { data: catalogs, error: catalogError } = await supabase
        .from('public_catalogs')
        .select('catalog_slug, updated_at')
        .eq('is_active', true)
        .not('catalog_slug', 'is', null)
        .limit(5000);

      if (catalogError) {
        console.error('[sitemap] Erro ao buscar public_catalogs:', catalogError);
      }

      const catalogRoutes: MetadataRoute.Sitemap = (catalogs || [])
        .filter((cat) => Boolean(cat.catalog_slug && cat.catalog_slug.trim()))
        .map((cat) => ({
          url: `${APP_URL}/catalogo/${encodeURIComponent(cat.catalog_slug.trim())}`,
          lastModified: cat.updated_at ? new Date(cat.updated_at) : now,
          changeFrequency: 'daily' as const,
          priority: 0.8,
        }));

      // 2. Empresas (distribuidoras) com slug público
      const { data: companies, error: companyError } = await supabase
        .from('companies')
        .select('slug, updated_at')
        .not('slug', 'is', null)
        .limit(1000);

      if (companyError) {
        console.error('[sitemap] Erro ao buscar companies:', companyError);
      }

      const existingSlugs = new Set(
        (catalogs || []).map((c) => (c.catalog_slug || '').trim().toLowerCase())
      );

      const companyRoutes: MetadataRoute.Sitemap = (companies || [])
        .filter((comp) => {
          const s = (comp.slug || '').trim().toLowerCase();
          return Boolean(s && !existingSlugs.has(s));
        })
        .map((comp) => ({
          url: `${APP_URL}/catalogo/${encodeURIComponent(comp.slug.trim())}`,
          lastModified: comp.updated_at ? new Date(comp.updated_at) : now,
          changeFrequency: 'daily' as const,
          priority: 0.8,
        }));

      return [...staticRoutes, ...catalogRoutes, ...companyRoutes];
    }
  } catch (error) {
    console.error('[sitemap] Erro inesperado ao gerar sitemap dinâmico:', error);
  }

  return staticRoutes;
}
