import { createClient } from '@/lib/supabase/server';
import { ApplicationContextService } from '@/modules/catalog/ApplicationContextService';
import { ApplicationContextAssembler } from '@/modules/catalog/ApplicationContextAssembler';
import { RepositoryFactory } from '@/infrastructure/supabase/RepositoryFactory';
import { Users, Package, ShoppingCart, UsersRound } from 'lucide-react';

export default async function DistribuidoraDashboard() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', user.id)
    .single();

  if (!profile?.organization_id) return null;

  const orgRepo = RepositoryFactory.organization(supabase as any);
  const profileRepo = RepositoryFactory.profile(supabase as any);
  const brandingRepo = RepositoryFactory.branding(supabase as any);
  
  const assembler = new ApplicationContextAssembler(orgRepo, profileRepo, brandingRepo);
  const contextService = new ApplicationContextService(assembler);
  
  const context = await contextService.resolve(profile.organization_id);

  if (!context?.organization) return null;

  // Basic aggregations
  const [{ count: repCount }, { count: productCount }, { count: orderCount }, { count: customerCount }] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('organization_id', profile.organization_id).eq('role', 'representative'),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('organization_id', profile.organization_id),
    supabase.from('orders').select('*', { count: 'exact', head: true }).eq('organization_id', profile.organization_id),
    supabase.from('customers').select('*', { count: 'exact', head: true }).eq('organization_id', profile.organization_id),
  ]);

  const stats = [
    { name: 'Representantes', value: repCount || 0, icon: Users, color: 'text-blue-600', bg: 'bg-blue-100' },
    { name: 'Produtos', value: productCount || 0, icon: Package, color: 'text-emerald-600', bg: 'bg-emerald-100' },
    { name: 'Pedidos', value: orderCount || 0, icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-100' },
    { name: 'Clientes', value: customerCount || 0, icon: UsersRound, color: 'text-orange-600', bg: 'bg-orange-100' },
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bem-vindo(a), {context.organization.name}</h1>
        <p className="text-slate-500 mt-2">Visão geral da sua distribuidora</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 flex items-center shadow-sm">
              <div className={`p-4 rounded-full ${stat.bg} ${stat.color} dark:bg-opacity-20`}>
                <Icon className="w-8 h-8" />
              </div>
              <div className="ml-5">
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.name}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Exibição do Plano e Funcionalidades do Contexto */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">Informações do Plano</h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Plano Atual</span>
              <span className="font-medium px-3 py-1 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 rounded-full text-sm">
                {context.plan?.name || 'Gratuito'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-slate-600 dark:text-slate-400">Módulos Ativos</span>
              <span className="font-medium">{context.modules?.length || 0} módulos</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">Módulos Carregados</h2>
          <div className="flex flex-wrap gap-2">
            {context.modules?.map((mod) => (
              <span key={mod} className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 rounded text-xs font-medium uppercase tracking-wider">
                {mod}
              </span>
            ))}
            {(!context.modules || context.modules.length === 0) && (
              <span className="text-sm text-slate-500">Nenhum módulo ativo no contexto.</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
