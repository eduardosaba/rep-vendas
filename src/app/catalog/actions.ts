'use server';

import createClient from '@/lib/supabaseServer';
import { cookies } from 'next/headers';

// Precisamos criar um cliente com permissões de ADMIN para salvar o pedido
// pois o cliente público (anon) pode ter restrições dependendo do seu RLS.
// Mas para simplificar e usar a estrutura padrão, vamos usar o client padrão
// e confiar na policy "Public can insert orders" que criamos no SQL.

export async function createOrder(
  storeOwnerId: string,
  customer: { name: string; phone: string },
  cartItems: any[]
) {
  // Valida variáveis de ambiente antes de tentar usar o Supabase
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    console.error('Variáveis de ambiente do Supabase não configuradas');
    throw new Error(
      'Configuração do Supabase ausente (NEXT_PUBLIC_SUPABASE_URL/ANON_KEY)'
    );
  }

  const supabase = await createClient();

  // 1. Calcular totais no servidor (mais seguro que confiar no front)
  let totalValue = 0;
  let itemCount = 0;

  const itemsToSave = cartItems.map((item) => {
    const total = item.price * item.quantity;
    totalValue += total;
    itemCount += item.quantity;

    return {
      product_id: item.id,
      product_name: item.name,
      product_reference: item.reference_code,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: total,
    };
  });

  // 2. Criar o Pedido (Order)
  // Tenta inserir usando o formato esperado pela aplicação (campos como
  // client_name_guest, item_count e display_id), mas mantém um fallback
  // para esquemas que não tenham essas colunas.
  let order: any = null;
  try {
    const insertResp = await supabase
      .from('orders')
      .insert({
        user_id: storeOwnerId,
        client_name_guest: customer.name,
        client_phone_guest: customer.phone,
        total_value: totalValue,
        item_count: itemCount,
        status: 'Pendente',
      })
      .select()
      .single();

    if (insertResp.error) throw insertResp.error;
    order = insertResp.data;
  } catch (firstError) {
    console.warn(
      'Inserção padrão falhou, tentando fallback de esquema:',
      firstError
    );
    // Fallback: insere apenas os campos mínimos que existem no esquema base
    const fallback = await supabase
      .from('orders')
      .insert({
        user_id: storeOwnerId,
        total_value: totalValue,
        status: 'Pendente',
      })
      .select()
      .single();

    if (fallback.error) {
      console.error('Erro ao criar pedido (fallback):', fallback.error);
      throw new Error('Falha ao registrar pedido no sistema.');
    }

    order = fallback.data;
  }

  // 3. Criar os Itens (Order Items)
  const itemsWithOrderId = itemsToSave.map((item) => ({
    ...item,
    order_id: order.id,
  }));

  const { error: itemsError } = await supabase
    .from('order_items')
    .insert(itemsWithOrderId);

  if (itemsError) {
    console.error('Erro ao criar itens:', itemsError);
    // Nota: Numa aplicação real, faríamos rollback aqui, mas o Supabase não suporta transações via API JS simples.
    // Como é um MVP, assumimos o risco ou apagamos o pedido órfão.
    await supabase.from('orders').delete().eq('id', order.id);
    throw new Error('Falha ao registrar itens do pedido.');
  }

  return {
    success: true,
    orderId: order.display_id ?? null,
    orderUUID: order.id,
  };
}
