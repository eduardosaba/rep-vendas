import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { NewOrderClient } from '@/components/dashboard/NewOrderClient';

export const dynamic = 'force-dynamic';

export default async function NewOrderPage() {
  const supabase = await createClient();

  // 1. Autenticação
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // 2. Buscar Produtos Disponíveis para o Catálogo
  // Trazemos os campos necessários para a venda
  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user.id)
    .order('name');

  // 3. Buscar Configurações (para saber se tem controle de estoque, etc)
  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
    .single();

  return (
    <div className="max-w-[1600px] mx-auto pb-20">
      <NewOrderClient
        initialProducts={products || []}
        userSettings={settings}
        userId={user.id}
      />
    </div>
  );
}
