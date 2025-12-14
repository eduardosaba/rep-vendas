'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { mapToDbStatus } from '@/lib/orderStatus';

export async function createOrder(
  ownerId: string,
  customer: { name: string; phone: string; email?: string; cnpj?: string },
  cartItems: any[]
) {
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

  try {
    // 1. Busca Configurações da Loja (Estoque e Backorder) - com resiliência .maybeSingle()
    const { data: settings } = await supabase
      .from('settings')
      .select('enable_stock_management, global_allow_backorder, name')
      .eq('user_id', ownerId)
      .maybeSingle();

    // Fallbacks para valores padrão se não houver settings
    const shouldManageStock = settings?.enable_stock_management || false;
    const allowBackorder = settings?.global_allow_backorder || false;

    // 2. Validação de Estoque (Pré-venda)
    if (shouldManageStock && !allowBackorder) {
      for (const item of cartItems) {
        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity, name')
          .eq('id', item.id)
          .single();

        // Se o item for "manual" (não tem ID no banco), pulamos a validação rigorosa ou assumimos estoque infinito
        // Mas se tiver ID, validamos:
        if (product && (product.stock_quantity || 0) < item.quantity) {
          return {
            success: false,
            error: `Estoque insuficiente para: ${product.name}. (Disponível: ${product.stock_quantity})`,
          };
        }
      }
    }

    // 3. Criar o Pedido
    const displayId = Math.floor(Date.now() / 1000) % 1000000;

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        user_id: ownerId,
        display_id: displayId,
        status: mapToDbStatus('pending'),
        total_value: cartItems.reduce(
          (acc, item) => acc + item.price * item.quantity,
          0
        ),
        item_count: cartItems.reduce((acc, item) => acc + item.quantity, 0),
        client_name_guest: customer.name,
        client_phone_guest: customer.phone,
        client_email_guest: customer.email || null,
        // CORREÇÃO: Usando o nome correto da coluna
        client_cnpj_guest: customer.cnpj || null,
      })
      .select()
      .single();

    if (orderError)
      throw new Error(`Erro ao criar pedido: ${orderError.message}`);

    // 4. Inserir Itens do Pedido
    // Filtra itens manuais sem ID válido se necessário, ou insere direto se a tabela permitir nullable
    // Assumindo que order_items requer product_id válido ou nulo:
    const orderItems = cartItems.map((item) => ({
      order_id: order.id,
      product_id: item.is_manual ? null : item.id, // Se for manual, product_id é null
      product_name: item.name,
      product_reference: item.reference_code,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsError)
      throw new Error(`Erro ao inserir itens: ${itemsError.message}`);

    // 5. Baixa de Estoque
    if (shouldManageStock) {
      for (const item of cartItems) {
        if (!item.is_manual) {
          // Só baixa estoque de produtos reais
          const { error: stockError } = await supabase.rpc('decrement_stock', {
            p_product_id: item.id,
            p_quantity: item.quantity,
            p_allow_backorder: allowBackorder,
          });

          if (stockError) console.error(`Falha estoque ${item.id}`, stockError);
        }
      }
    }

    revalidatePath('/dashboard');
    revalidatePath(`/catalog`);

    return {
      success: true,
      orderId: displayId,
      clientEmail: customer.email,
      clientDocument: customer.cnpj,
    };
  } catch (error: any) {
    console.error(error);
    return { success: false, error: error.message || 'Erro interno.' };
  }
}
