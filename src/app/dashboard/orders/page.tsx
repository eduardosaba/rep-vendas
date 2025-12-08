import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OrdersTable } from '@/components/dashboard/OrdersTable';

// Força a página a ser dinâmica (sem cache estático) para garantir dados frescos
export const dynamic = 'force-dynamic';

export default async function OrdersPage() {
  const ensureSupabaseEnv = () => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      // eslint-disable-next-line no-console
      console.error(
        'Faltam variáveis de ambiente Supabase: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
      throw new Error(
        'Configuração inválida: verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    }
  };

  ensureSupabaseEnv();
  const supabase = await createClient();

  // 1. Autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Busca de Dados (Server-Side)
  // Buscamos todos os pedidos do usuário para permitir filtro/ordenação rápida no cliente
  const { data: orders, error } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar pedidos:', error);
  }

  // 3. Renderiza o componente Cliente com os dados iniciais
  return (
    <div className="max-w-6xl mx-auto">
      <OrdersTable initialOrders={orders || []} />
    </div>
  );
}
