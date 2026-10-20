import { createClient } from '@/lib/supabase/server';
import { mapToDbStatus, getUiStatusKey } from '@/lib/orderStatus';
import { revalidatePath } from 'next/cache';

export async function POST(req: Request) {
  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return new Response(
        JSON.stringify({ success: false, error: 'missing orderId' }),
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data: sessionUser } = await supabase.auth.getUser();
    const userId = sessionUser?.user?.id || null;
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Não autenticado' }),
        { status: 401 }
      );
    }

    // Buscar pedido com dados de modelo e status
    const { data: order } = await supabase
      .from('orders')
      .select('id, user_id, seller_id, company_id, display_id, status, order_management_mode')
      .eq('id', orderId)
      .maybeSingle();

    if (!order) {
      return new Response(
        JSON.stringify({ success: false, error: 'Pedido não encontrado' }),
        { status: 404 }
      );
    }

    const isSeller = String(order.seller_id || '') === String(userId);
    const isOwner = String(order.user_id) === String(userId);

    if (!isSeller && !isOwner) {
      return new Response(
        JSON.stringify({ success: false, error: 'Sem permissão para liberar este pedido' }),
        { status: 403 }
      );
    }

    // Resolução prioritária do modelo registrado no pedido
    let orderManagementMode: 'representative' | 'distributor' =
      order.order_management_mode || 'representative';

    if (!order.order_management_mode && order.company_id) {
      const { data: comp } = await supabase
        .from('companies')
        .select('order_management_mode')
        .eq('id', order.company_id)
        .maybeSingle();
      if (comp?.order_management_mode === 'distributor') {
        orderManagementMode = 'distributor';
      }
    }

    // Validação de modelo: liberação só se aplica ao modelo B2B Completo
    if (orderManagementMode !== 'distributor' || !order.company_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            'Este pedido pertence ao modelo Catálogo Digital e não exige liberação para a distribuidora. O representante pode confirmá-lo diretamente.',
        }),
        { status: 400 }
      );
    }

    // Validação de estado atual: somente pedidos em 'pending_review' podem ser liberados
    const currentUiStatus = getUiStatusKey(order.status);
    if (currentUiStatus !== 'pending_review') {
      return new Response(
        JSON.stringify({
          success: false,
          error:
            currentUiStatus === 'pending'
              ? 'Este pedido já foi liberado e está aguardando aprovação da distribuidora.'
              : `Não é possível liberar um pedido com status "${order.status}".`,
        }),
        { status: 409 }
      );
    }

    const { data: updated, error } = await supabase
      .from('orders')
      .update({ status: mapToDbStatus('pending') })
      .eq('id', orderId)
      .select('id');

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        { status: 500 }
      );
    }

    if (!updated || updated.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Nenhuma alteração realizada. Verifique permissões do pedido.',
        }),
        { status: 403 }
      );
    }

    revalidatePath('/dashboard/orders');
    if (order.display_id) {
      revalidatePath(`/dashboard/orders/${order.display_id}`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Pedido liberado com sucesso para a distribuidora.',
      }),
      { status: 200 }
    );
  } catch (e: any) {
    console.error('orders/release error', e);
    return new Response(
      JSON.stringify({ success: false, error: e?.message || 'Erro interno' }),
      { status: 500 }
    );
  }
}
