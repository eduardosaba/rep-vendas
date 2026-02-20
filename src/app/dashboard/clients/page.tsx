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
      'id, display_id, created_at, status, total_value, item_count, client_name_guest, client_phone_guest, client_email_guest, client_id, clients ( name, phone, email )'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  // Também buscar clientes cadastrados manualmente (tabela `clients`) e enviar para a tabela
  const { data: clientsList, error: clientsError } = await supabase
    .from('clients')
    .select('id, name, phone, email, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao buscar clientes:', error);
  }

  return (
    <div className="max-w-[1600px] mx-auto">
      {/* Passamos os pedidos brutos e a lista de clientes cadastrados manualmente */}
      <ClientsTable initialOrders={orders || []} initialClients={clientsList || []} />
    </div>
  );
}
