import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FeatureService } from '@/domain/settings/feature-service'
import { SettingsClient } from './settings-client'

export const metadata = {
  title: 'Configurações da Distribuidora | RepVendas',
  description: 'Gerencie as regras operacionais, fiscais e de expedição da sua distribuidora.'
}

export default async function ConfiguracoesPage() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id, role')
    .eq('id', user.id)
    .single()

  if (!profile?.organization_id) redirect('/login')

  // Apenas master e admin_company podem ver/gerenciar configurações
  const isAuthorized = ['master', 'admin_company'].includes(profile.role || '')
  if (!isAuthorized) {
    return (
      <div className="p-8 max-w-4xl mx-auto text-center">
        <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 p-6 rounded-2xl border border-red-100 dark:border-red-900/30">
          <h2 className="text-lg font-bold mb-2">Acesso Negado</h2>
          <p>Você precisa de permissão de administrador para acessar as configurações operacionais.</p>
        </div>
      </div>
    )
  }

  // Busca as configurações atuais
  const settings = await FeatureService.getSettings(profile.organization_id)

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
          Configurações Operacionais
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          Gerencie as regras operacionais, fiscais e logísticas da distribuidora
        </p>
      </div>

      <SettingsClient initialSettings={settings} />
    </div>
  )
}
