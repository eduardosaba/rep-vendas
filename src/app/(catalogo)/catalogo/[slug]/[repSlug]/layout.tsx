import React from 'react'
import { createClient } from '@/lib/supabase/server'
import RepProvider from '@/components/catalogo/RepProvider'
import RepIdentityBadge from '@/components/catalogo/RepIdentityBadge'

export const dynamic = 'force-dynamic'

export default async function RepLayout({ children, params }: { children: React.ReactNode; params: Promise<{ slug: string; repSlug: string }> }) {
  const { slug, repSlug } = await params
  const normalizedCompanySlug = String(slug || '').trim().toLowerCase()
  const normalizedRepSlug = String(repSlug || '').trim().toLowerCase()
  const supabase = await createClient()

  let company: any = null
  try {
    const { data } = await supabase.from('companies').select('id').ilike('slug', normalizedCompanySlug).maybeSingle()
    company = data
  } catch (e) {
    company = null
  }

  let representative: any = null
  try {
    if (company && normalizedRepSlug) {
      const { data } = await supabase.from('profiles').select('id,full_name,display_name,avatar_url,whatsapp,slug,company_id').ilike('slug', normalizedRepSlug).eq('company_id', company.id).maybeSingle()
      representative = data
    }
  } catch (e) {
    representative = null
  }

  return (
    <RepProvider rep={representative}>
      {representative ? <RepIdentityBadge representative={representative} /> : null}
      {children}
    </RepProvider>
  )
}
