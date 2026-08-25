import { createRouteSupabase } from '@/lib/supabase/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import { getOrderService } from '@/domain/orders/OrderService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUserFallback();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const service = getOrderService();
    const order = await service.getOrder(user.id, id);

    if (!order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
    }

    // Buscar itens do pedido
    const supabase = await createRouteSupabase();
    const { data: items } = await supabase
      .from('order_items')
      .select('*')
      .eq('order_id', id);

    return NextResponse.json({ ...order, items: items || [] });
  } catch (error: any) {
    console.error('[api/orders/[id]] GET error:', error);
    const status = error.message?.includes('perm') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao buscar pedido' }, { status });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUserFallback();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;
    const body = await request.json();

    const service = getOrderService();

    const expectedVersion = parseInt(body.expected_version || body.version || '1', 10);
    const { id, version, commercial_status, operational_status, created_at, updated_at, ...updates } = body;

    const result = await service.updateOrder(user.id, orderId, expectedVersion, updates);

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[api/orders/[id]] PUT error:', error);
    const isConcurrency = error.message?.includes('CONFLICT_VERSION');
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar pedido' },
      { status: isConcurrency ? 409 : 400 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUserFallback();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: orderId } = await params;

    const service = getOrderService();
    await service.deleteOrder(user.id, orderId);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[api/orders/[id]] DELETE error:', error);
    const isForbidden = error.message?.includes('não podem ser excluídos fisicamente');
    return NextResponse.json(
      { error: error.message || 'Erro ao excluir pedido' },
      { status: isForbidden ? 422 : 400 }
    );
  }
}