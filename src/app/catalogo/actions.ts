'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { mapToDbStatus } from '@/lib/orderStatus';

export async function createOrder(
  ownerId: string,
  customer: { name: string; phone: string; email?: string; cnpj?: string },
  cartItems: any[],
  adminSupabaseOverride: ReturnType<typeof createSupabaseClient> | null = null
) {
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

  // Se houver a chave SERVICE ROLE disponível no ambiente, crie um cliente admin
  // para operações server-side que precisam contornar RLS (inserts/updates críticos).
  const adminKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  const adminSupabase =
    adminSupabaseOverride ||
    (adminKey && process.env.NEXT_PUBLIC_SUPABASE_URL
      ? createSupabaseClient(
          String(process.env.NEXT_PUBLIC_SUPABASE_URL),
          String(adminKey)
        )
      : null);

  let currentStage = 'start';

  try {
    // 1. Busca Configurações da Loja (Estoque e Backorder) - com resiliência .maybeSingle()
    const { data: settings } = await (adminSupabase ?? supabase)
      .from('settings')
      .select('enable_stock_management, global_allow_backorder, name')
      .eq('user_id', ownerId)
      .maybeSingle();

    // Fallbacks para valores padrão se não houver settings
    const shouldManageStock = settings?.enable_stock_management || false;
    const allowBackorder = settings?.global_allow_backorder || false;

    // 2. Validação de Estoque (Pré-venda)
    if (shouldManageStock && !allowBackorder) {
      currentStage = 'stock_validation';
      for (const item of cartItems) {
        // Se item não tem id (manual), pulamos validação
        if (!item.id) continue;
        const { data: product, error: productErr } = await supabase
          .from('products')
          .select('stock_quantity, name')
          .eq('id', item.id)
          .maybeSingle();

        if (productErr) {
          console.error('createOrder - product lookup error', {
            stage: currentStage,
            item,
            error: productErr,
          });
          throw new Error(`stock_check: Erro ao consultar produto ${item.id}`);
        }

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

    currentStage = 'order_insert';
    const insertClient = adminSupabase ?? supabase;
    const { data: order, error: orderError } = await insertClient
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
      .maybeSingle();

    if (orderError) {
      console.error('createOrder - order insert error', {
        stage: currentStage,
        orderError,
      });
      throw new Error(`order_insert: ${orderError.message}`);
    }

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

    currentStage = 'items_insert';
    const { error: itemsError } = await insertClient
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('createOrder - items insert error', {
        stage: currentStage,
        itemsError,
        orderItemsLength: orderItems.length,
      });
      throw new Error(`items_insert: ${itemsError.message}`);
    }

    // 5. Baixa de Estoque
    if (shouldManageStock) {
      for (const item of cartItems) {
        if (!item.is_manual) {
          // Só baixa estoque de produtos reais
          const rpcClient = adminSupabase ?? supabase;
          const { error: stockError } = await rpcClient.rpc('decrement_stock', {
            p_product_id: item.id,
            p_quantity: item.quantity,
            p_allow_backorder: allowBackorder,
          });

          if (stockError) {
            console.error('createOrder - decrement_stock rpc error', {
              stage: 'stock_rpc',
              itemId: item.id,
              stockError,
            });
          }
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
    console.error('createOrder - caught error', {
      currentStage:
        typeof currentStage !== 'undefined' ? currentStage : 'unknown',
      message: error?.message,
    });
    return { success: false, error: error.message || 'Erro interno.' };
  }
}
