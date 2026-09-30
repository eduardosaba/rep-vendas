import React from 'react';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { resolveCatalogBranding } from '@/lib/resolve-catalog-branding';

export default async function ThemeLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  // Resolve cores e branding usando a hierarquia: company → settings do admin
  let primaryColor = '#0F172A';
  let secondaryColor = '#F8FAFC';
  let fontFamily = 'font-sans';

  try {
    const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (adminKey && supabaseUrl) {
      const admin = createSupabaseAdmin(supabaseUrl, adminKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });

      const normalizedSlug = String(slug || '').trim();

      // 1. Achar a empresa pelo slug (case-insensitive)
      let { data: company } = await admin
        .from('companies')
        .select('id,primary_color,secondary_color')
        .ilike('slug', normalizedSlug)
        .maybeSingle();

      // Fallback: tentar por public_catalogs
      if (!company) {
        const { data: pc } = await admin
          .from('public_catalogs')
          .select('company_id,primary_color,secondary_color')
          .ilike('catalog_slug', normalizedSlug)
          .maybeSingle();

        if (pc?.company_id) {
          const { data: compFromPc } = await admin
            .from('companies')
            .select('id,primary_color,secondary_color')
            .eq('id', pc.company_id)
            .maybeSingle();
          company = compFromPc;
        } else if (pc) {
          primaryColor = pc.primary_color || primaryColor;
          secondaryColor = pc.secondary_color || secondaryColor;
        }
      }

      if (company?.id) {
        primaryColor = company.primary_color || primaryColor;
        secondaryColor = company.secondary_color || secondaryColor;

        // 2. Achar o admin da distribuidora para sobrescrever com settings
        const { data: admins } = await admin
          .from('profiles')
          .select('id,role')
          .eq('company_id', company.id)
          .in('role', ['admin_company', 'master'])
          .limit(1);

        const owner = Array.isArray(admins) && admins.length > 0 ? admins[0] : null;
        if (owner?.id) {
          const branding = await resolveCatalogBranding(owner.id, company.id);
          primaryColor = branding.primary_color || primaryColor;
          secondaryColor = branding.secondary_color || secondaryColor;
          fontFamily = branding.font_family || fontFamily;
        }
      }
    }
  } catch (_) {
    // fallback para valores padrão em caso de erro
  }

  const themeStyles = {
    '--primary': primaryColor,
    '--secondary': secondaryColor,
  } as React.CSSProperties;

  return (
    <div style={themeStyles} className={fontFamily}>
      {children}
    </div>
  );
}

