import React from 'react'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js'
import RepProvider from '@/components/catalogo/RepProvider'
import RepIdentityBadge from '@/components/catalogo/RepIdentityBadge'

export const dynamic = 'force-dynamic'

export default async function RepLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string; repSlug: string }> }) {
  const { slug, repSlug } = await params
  const normalizedCompanySlug = String(slug || '').trim().toLowerCase()
  const normalizedRepSlug = String(repSlug || '').trim().toLowerCase()
  const supabase = await createClient();
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const admin = adminKey && supabaseUrl ? createSupabaseAdmin(String(supabaseUrl), String(adminKey), { auth: { autoRefreshToken: false, persistSession: false } }) : null;
  const clientToUse = admin || supabase;

  let company: any = null;
  try {
    const { data } = await clientToUse.from('companies').select('id').ilike('slug', normalizedCompanySlug).maybeSingle();
    company = data;
  } catch (e) {
    company = null;
  }

  let representative: any = null;
  try {
    if (company && normalizedRepSlug) {
      const { data } = await clientToUse.from('profiles').select('id,full_name,display_name,avatar_url,whatsapp,slug,company_id').ilike('slug', normalizedRepSlug).eq('company_id', company.id).maybeSingle();
      representative = data;
    }
  } catch (e) {
    representative = null;
  }

  return (
    <RepProvider rep={representative}>
      {representative ? <RepIdentityBadge representative={representative} /> : null}
      {children}
    </RepProvider>
  )
}
