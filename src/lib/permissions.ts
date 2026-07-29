import { createClient } from '@supabase/supabase-js'

// Client administrativo apenas para leitura interna de escopo de permissões
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

interface QueryScope {
  /** Se true, filtra estritamente por company_id (enxerga equipe). Se false, filtra por user_id individual. */
  isCompanyScope: boolean
  companyId: string | null
  userId: string
  role: string
}

/**
 * Resolve o escopo de visibilidade para a distribuidora.
 * Garante segurança multi-vendedor no nível de aplicação.
 */
export async function resolveUserScope(userId: string): Promise<QueryScope> {
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('company_id, role')
    .eq('id', userId)
    .single()

  if (error || !profile) {
    return {
      isCompanyScope: false,
      companyId: null,
      userId,
      role: 'rep'
    }
  }

  const isAdmin = ['admin_company', 'master'].includes(profile.role || '')
  const hasCompany = !!profile.company_id

  return {
    isCompanyScope: isAdmin && hasCompany,
    companyId: profile.company_id,
    userId,
    role: profile.role || 'rep'
  }
}
