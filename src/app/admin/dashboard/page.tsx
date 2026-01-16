import { createClient } from '@/lib/supabase/server';
import CatalogHealth from '@/components/admin/CatalogHealth';
import { redirect } from 'next/navigation';

export default async function Page() {
  const supabase = await createClient();

  // valida role do usuário (apenas master pode acessar a torre de controle)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return redirect('/auth');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role || null;
  if (role !== 'master') {
    // redireciona para área admin padrão
    return redirect('/admin');
  }

  // Busca estatísticas via RPC
  const { data: stats, error } = await supabase.rpc('get_catalog_health_stats');

  if (error) {
    console.error('Erro ao buscar catalog health stats:', error);
  }

  // KPI: total de produtos ativos na rede
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);

  const totalProducts = Number(count || 0);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">
        Dashboard de Saúde do Catálogo
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-bold">
            Total de Produtos Ativos
          </p>
          <h2 className="text-3xl font-black mt-2">{totalProducts}</h2>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-bold">
            Estados com Alertas
          </p>
          <h2 className="text-3xl font-black mt-2">—</h2>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
          <p className="text-xs text-gray-500 uppercase font-bold">
            Última Sincronização
          </p>
          <h2 className="text-3xl font-black mt-2">—</h2>
        </div>
      </div>

      <CatalogHealth stats={stats || []} />
    </div>
  );
}
