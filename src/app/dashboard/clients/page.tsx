import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { ClientsTable } from '@/components/dashboard/ClientsTable';

// Garante que os dados estejam sempre atualizados (sem cache estático)
export const dynamic = 'force-dynamic';

export default async function ClientsPage() {
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Busca todos os pedidos para que o Client Component calcule o perfil dos clientes (LTV, Histórico, etc.)
  // Selecionamos apenas os campos necessários para performance
  const { data: orders, error } = await supabase
    .from('orders')
    .select(
      'id, display_id, created_at, status, total_value, item_count, client_name_guest, client_phone_guest, client_email_guest'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar clientes:', error);
  }

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Passamos os pedidos brutos; a mágica de agrupar por cliente acontece aqui dentro */}
      <ClientsTable initialOrders={orders || []} />
    </div>
  );
}
