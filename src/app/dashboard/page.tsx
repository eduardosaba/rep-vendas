import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveUserId } from '@/lib/auth-utils'
import { StatCard } from '@/components/StatCard'
import RecentOrdersTable from '@/components/RecentOrdersTable'
import { DashboardCharts } from '@/components/dashboard/DashboardCharts'
import DateFilter from '@/components/dashboard/DateFilter'
import {
  DollarSign,
  ShoppingBag,
  Package,
  Users,
  ExternalLink,
  RefreshCcw,
  PlusCircle,
  Settings as SettingsIcon,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Building2,
  Store,
  HelpCircle,
} from 'lucide-react'
import Link from 'next/link'
import QuickActionCard from '@/components/QuickActionCard'
import NotificationsCTA from '@/components/NotificationsCTA'
import { DashboardChecklist } from '@/components/dashboard/DashboardChecklist'
import { isCompanyAdmin, isGlobalAdmin } from '@/lib/auth/roles'
import { subDays, startOfDay, subMonths } from 'date-fns'

export const dynamic = 'force-dynamic'

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string } | undefined>
}) {
  const supabase = await createClient()
  const resolvedSearchParams = (await searchParams) || {}
  const range = resolvedSearchParams.range || '30d'

  const activeUserId = await getActiveUserId()
  if (!activeUserId) redirect('/login')

  // Busca perfil para identificar role, company, organization e user_category
  const { data: profileData } = await supabase
    .from('profiles')
    .select('role, company_id, organization_id, full_name, store_name, email, notifications_enabled, user_category')
    .eq('id', activeUserId)
    .maybeSingle()

  // Identificação robusta da organização
  let orgType: 'distributor' | 'optical_store' | 'independent_representative' = 'independent_representative';
  let orgName: string | null = null;

  if (profileData?.organization_id) {
    const { data: org } = await supabase
      .from('organizations')
      .select('name, organization_type')
      .eq('id', profileData.organization_id)
      .maybeSingle();
    if (org) {
      if (
        org.organization_type === 'distributor' ||
        org.organization_type === 'optical_store' ||
        org.organization_type === 'independent_representative'
      ) {
        orgType = org.organization_type;
      }
      orgName = org.name || null;
    }
  }

  let companyName: string | null = null;
  let companyType: string | null = null;
  const companyId = profileData?.company_id;

  if (companyId) {
    try {
      const compRes = await supabase.from('companies').select('name, type').eq('id', companyId).maybeSingle();
      companyName = compRes?.data?.name ?? null;
      companyType = compRes?.data?.type ?? null;
      if (!orgName && companyName) orgName = companyName;
      if (orgType === 'independent_representative' && companyType) {
        if (companyType === 'distribuidora' || companyType === 'distributor') {
          orgType = 'distributor';
        } else if (companyType === 'optica' || companyType === 'optical_store' || companyType === 'otica') {
          orgType = 'optical_store';
        }
      }
    } catch (err) {
      console.error('Erro ao buscar dados da company:', err);
    }
  }

  const roleLower = String(profileData?.role || '').toLowerCase();
  const categoryLower = String(profileData?.user_category || '').toLowerCase();

  const isDistributorRole =
    roleLower === 'admin_company' ||
    roleLower === 'company_admin' ||
    roleLower === 'distributor' ||
    categoryLower === 'distributor' ||
    isCompanyAdmin(profileData?.role);

  const isOpticalRole =
    roleLower === 'optical_store' ||
    roleLower === 'optical_client' ||
    roleLower === 'lojista' ||
    roleLower === 'optica' ||
    roleLower === 'otica' ||
    categoryLower === 'optical_store';

  // Se o usuário tem role de representante vinculado a distribuidora,
  // ele é um Representante daquela Distribuidora:
  const isLinkedRep = (roleLower === 'rep' || roleLower === 'representative') && Boolean(companyId);

  // Determina o tipo de perfil ativo
  let profileKind: 'distributor' | 'optical_store' | 'representative' = 'representative';
  if (!isLinkedRep) {
    if (isDistributorRole || orgType === 'distributor') {
      profileKind = 'distributor';
    } else if (isOpticalRole || orgType === 'optical_store') {
      profileKind = 'optical_store';
    }
  }

  const isAdmin = profileKind === 'distributor' || isGlobalAdmin(profileData?.role) || roleLower === 'master' || roleLower === 'admin';

  const dashboardFilter = {
    column: isAdmin ? 'company_id' : 'user_id',
    value: isAdmin ? companyId : activeUserId,
  }

  // Período
  let startDate = subDays(new Date(), 30).toISOString()
  if (range === 'today') startDate = startOfDay(new Date()).toISOString()
  if (range === '7d') startDate = subDays(new Date(), 7).toISOString()
  if (range === '6m') startDate = subMonths(new Date(), 6).toISOString()
  const now = new Date().toISOString()

  // Buscas principais (usam filtro dinâmico)
  const results = await Promise.allSettled([
    supabase
      .rpc('get_dashboard_totals', {
        owner_id: dashboardFilter.value,
        start_date: startDate,
        end_date: now,
      })
      .maybeSingle(),
    companyId
      ? supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .or(`company_id.eq.${companyId},user_id.eq.${activeUserId}`)
          .eq('is_active', true)
      : supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', activeUserId)
          .eq('is_active', true),
    isAdmin
      ? supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', companyId)
          .gte('created_at', startDate)
      : supabase
          .from('orders')
          .select('*', { count: 'exact', head: true })
          .or(`user_id.eq.${activeUserId},seller_id.eq.${activeUserId}`)
          .gte('created_at', startDate),
    isAdmin
      ? supabase
          .from('orders')
          .select(
            `id, display_id, client_name_guest, total_value, status, created_at, order_items (id, quantity)`
          )
          .eq('company_id', companyId)
          .order('created_at', { ascending: false })
          .limit(5)
      : supabase
          .from('orders')
          .select(
            `id, display_id, client_name_guest, total_value, status, created_at, order_items (id, quantity)`
          )
          .or(`user_id.eq.${activeUserId},seller_id.eq.${activeUserId}`)
          .order('created_at', { ascending: false })
          .limit(5),
    supabase
      .from('settings')
      .select('*')
      .eq('user_id', activeUserId)
      .maybeSingle(),
    isAdmin
      ? supabase
          .from('orders')
          .select('total_value, created_at')
          .eq('company_id', companyId)
          .gte('created_at', startDate)
      : supabase
          .from('orders')
          .select('total_value, created_at')
          .or(`user_id.eq.${activeUserId},seller_id.eq.${activeUserId}`)
          .gte('created_at', startDate),
    supabase
      .from('sync_logs')
      .select('*')
      .eq('user_id', activeUserId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('system_updates')
      .select('*')
      .order('date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('sync_jobs')
      .select('*')
      .eq('user_id', activeUserId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // Extrair valores com fallback seguro
  const totals = results[0].status === 'fulfilled' ? results[0].value : { data: null, error: null }
  const products = results[1].status === 'fulfilled' ? results[1].value : { count: null, error: null }
  const orders = results[2].status === 'fulfilled' ? results[2].value : { count: null, error: null }
  const recentOrders = results[3].status === 'fulfilled' ? results[3].value : { data: [], error: null }
  const settings = results[4].status === 'fulfilled' ? results[4].value : { data: null, error: null }
  const profile = { data: profileData }
  const chartData = results[5].status === 'fulfilled' ? results[5].value : { data: [], error: null }
  const lastSync = results[6].status === 'fulfilled' ? results[6].value : { data: null, error: null }
  const latestUpdate = results[7].status === 'fulfilled' ? results[7].value : { data: null, error: null }
  const syncJob = results[8].status === 'fulfilled' ? results[8].value : { data: null, error: null }

  // Se for admin, buscamos contagem da equipe
  let teamCount = 0
  if (isAdmin && companyId) {
    try {
      const teamRes = await supabase
        .from('profiles')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
      teamCount = Number(teamRes.count ?? 0) || 0
    } catch (err) {
      console.error('Erro ao buscar contagem de representantes:', err)
      teamCount = 0
    }
  }

  // Contagem de clientes (RPC)
  let clientsCount = 0
  try {
    const clientsRes = await supabase.rpc('get_dashboard_clients_count', {
      p_owner_id: dashboardFilter.value,
      p_start_date: startDate,
    })
    const raw = clientsRes?.data ?? clientsRes
    clientsCount = Number(raw ?? 0) || 0
  } catch (err) {
    console.error('Erro ao calcular clientes únicos via RPC:', err)
    clientsCount = 0
  }

  // Sincronização
  const syncDate = lastSync.data ? new Date(lastSync.data.created_at) : null
  const daysSinceSync = syncDate ? Math.floor((new Date().getTime() - syncDate.getTime()) / (1000 * 3600 * 24)) : null
  const needsSyncAlert = daysSinceSync !== null && daysSinceSync > 15

  // Identificação do nome e perfil para a saudação
  const rawFullName = (profileData?.full_name || profileData?.store_name || '').trim();
  const isGenericName =
    !rawFullName ||
    rawFullName.toLowerCase() === 'representante' ||
    rawFullName.toLowerCase() === 'gestor' ||
    rawFullName.toLowerCase() === 'admin' ||
    rawFullName.toLowerCase() === 'distribuidora' ||
    rawFullName.toLowerCase() === 'otica' ||
    rawFullName.toLowerCase() === 'óptica' ||
    rawFullName.toLowerCase() === 'usuario' ||
    rawFullName.toLowerCase() === 'user';

  let greetingName = '';
  if (!isGenericName) {
    greetingName = rawFullName;
  } else {
    if (profileKind === 'distributor') {
      greetingName = orgName || 'Distribuidora';
    } else if (profileKind === 'optical_store') {
      greetingName = orgName || 'Ótica';
    } else {
      greetingName = profileData?.email ? profileData.email.split('@')[0] : 'Representante';
    }
  }

  // Configuração visual do Badge e Subtítulo de acordo com o perfil
  const badgeConfig = {
    distributor: {
      label: 'Distribuidora',
      className: 'bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
    },
    optical_store: {
      label: 'Ótica',
      className: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
    },
    representative: {
      label: isLinkedRep ? 'Representante da Distribuidora' : 'Representante',
      className: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
    },
  }[profileKind];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50 dark:bg-slate-950 p-4 md:p-8 animate-in fade-in duration-700">
      <header className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight flex items-center flex-wrap gap-2">
            <span>Olá, {greetingName} 👋</span>
            <span className={`text-[10px] uppercase font-bold tracking-wider px-3 py-1 rounded-full border ${badgeConfig.className}`}>
              {badgeConfig.label}
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            {profileKind === 'distributor'
              ? `Monitorando o desempenho global e vendas da equipe${orgName ? ` da ${orgName}` : ''}.`
              : profileKind === 'optical_store'
              ? `Painel de compras, pedidos e catálogo da ótica${orgName ? ` ${orgName}` : ''}.`
              : '📈 Acompanhe suas vendas, pedidos e clientes.'}
          </p>
          {settings.data && (
            <div className="mt-3">
              {settings.data.manage_stock ? (
                <div className="inline-flex items-center gap-2 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300 px-3 py-1 rounded-full text-xs font-semibold">
                  <AlertTriangle size={14} />
                  <span>⚠️ Alertas de Inventário — verifique itens críticos ⚠️</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-300 px-3 py-1 rounded-full text-xs font-semibold">
                  <CheckCircle2 size={14} />
                  <span>🔓 Controle de estoque desativado</span>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-4">
          <DateFilter currentRange={range} />

          {settings.data?.catalog_slug && (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: settings.data?.primary_color || '#2563EB' }} />
                <span className="font-semibold">Link do meu Catálogo</span>
              </div>
              <Link
                href={isAdmin ? `/catalogo/${settings.data.catalog_slug}/empresa` : `/catalogo/${settings.data.catalog_slug}`}
                target="_blank"
                className="flex items-center gap-3 bg-white dark:bg-slate-800 p-3 px-4 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm text-xs font-bold text-primary hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                style={settings.data?.primary_color ? { boxShadow: `${settings.data.primary_color}22 0px 0px 0px 4px` } : undefined}
                aria-label="Abrir meu catálogo em nova aba"
              >
                /{settings.data.catalog_slug} <ExternalLink size={14} />
              </Link>
            </div>
          )}
        </div>
      </header>

      {profile.data && (
        <div className="mb-8 flex flex-col gap-6">
          <NotificationsCTA userId={activeUserId} />
          <DashboardChecklist
            organizationLinked={Boolean(profile.data?.organization_id)}
            catalogConfigured={Boolean(settings.data?.catalog_slug)}
            productsCount={products.count || 0}
            catalogSlug={settings.data?.catalog_slug}
          />
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title={
            profileKind === 'distributor'
              ? 'Faturamento Global'
              : profileKind === 'optical_store'
              ? 'Total em Compras'
              : 'Minha Receita'
          }
          value={new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
            (isAdmin ? (totals.data as any)?.company_revenue ?? (totals.data as any)?.total_revenue : (totals.data as any)?.user_revenue ?? (totals.data as any)?.total_revenue) || 0
          )}
          icon={DollarSign}
          color={profileKind === 'distributor' ? 'indigo' : profileKind === 'optical_store' ? 'blue' : 'green'}
        />

        <StatCard
          title={
            profileKind === 'optical_store'
              ? 'Pedidos de Compra'
              : isAdmin
              ? 'Total de Pedidos'
              : 'Meus Pedidos'
          }
          value={orders.count || 0}
          icon={ShoppingBag}
          color="blue"
        />

        {profileKind === 'distributor' ? (
          <StatCard title="Representantes" value={teamCount} icon={Users} color="purple" />
        ) : profileKind === 'optical_store' ? (
          <StatCard title="Distribuidoras Parceiras" value={clientsCount || 1} icon={Building2} color="purple" />
        ) : (
          <StatCard title="Clientes Atendidos" value={clientsCount} icon={Users} color="purple" />
        )}

        <StatCard
          title={profileKind === 'optical_store' ? 'Catálogo de Produtos' : 'Mix de Produtos'}
          value={products.count || 0}
          icon={Package}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8 mb-8">
        <div className="xl:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-gray-200 dark:border-slate-800 shadow-sm min-h-[400px]">
          <DashboardCharts orders={chartData.data || []} />
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-[2.5rem] border border-gray-200 dark:border-slate-800 shadow-sm">
          <h3 className="font-bold text-gray-400 dark:text-slate-500 mb-5 uppercase text-xs tracking-widest">Ações Rápidas</h3>
          <div className="grid grid-cols-2 gap-4">
            {profileKind === 'distributor' ? (
              <>
                <QuickActionCard href="/dashboard/settings?tab=institucional" icon={Building2} label="Minha Marca" color="blue" />
                <QuickActionCard href="/dashboard/equipe" icon={Users} label="Minha Equipe" color="blue" />
                <QuickActionCard href="/dashboard/inventory" icon={Package} label="Estoque Global" color="red" />
                <QuickActionCard href="/dashboard/settings" icon={SettingsIcon} label="Configurações" color="slate" />
              </>
            ) : profileKind === 'optical_store' ? (
              <>
                <QuickActionCard href="/dashboard/orders" icon={ShoppingBag} label="Meus Pedidos" color="blue" />
                <QuickActionCard href="/dashboard/products" icon={Package} label="Catálogo" color="orange" />
                <QuickActionCard href="/dashboard/settings" icon={SettingsIcon} label="Configurações" color="slate" />
                <QuickActionCard href="/dashboard/help" icon={HelpCircle} label="Ajuda" color="blue" />
              </>
            ) : (
              <>
                <QuickActionCard href="/dashboard/products/new" icon={PlusCircle} label="Novo Produto" color="orange" />
                <QuickActionCard href="/dashboard/products/sync" icon={RefreshCcw} label="Sincronizar" color="blue" />
                <QuickActionCard href="/dashboard/inventory" icon={Package} label="Inventário" color="red" />
                <QuickActionCard href="/dashboard/settings" icon={SettingsIcon} label="Ajustes" color="slate" />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <RecentOrdersTable orders={recentOrders.data || []} store={settings.data} rangeLabel="Geral" />
      </div>
    </div>
  )
}
