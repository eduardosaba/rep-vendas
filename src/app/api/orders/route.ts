import { createRouteSupabase } from '@/lib/supabase/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import { getOrderService } from '@/domain/orders/OrderService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const user = await getServerUserFallback();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || '1');
    const limit = Number(url.searchParams.get('limit') || '20');
    const commercial_status = url.searchParams.get('commercial_status') || undefined;
    const operational_status = url.searchParams.get('operational_status') || undefined;
    const buyer_organization_id = url.searchParams.get('buyer_organization_id') || undefined;

    const service = getOrderService();

    const result = await service.listOrders(user.id, {
      commercial_status: commercial_status as any,
      operational_status: operational_status as any,
      buyer_organization_id,
      page,
      page_size: limit,
    });

    return NextResponse.json({
      data: result.data,
      meta: {
        totalCount: result.count,
        page: result.page,
        limit: result.pageSize,
        totalPages: result.totalPages,
      },
    });
  } catch (error: any) {
    console.error('[api/orders] GET error:', error);
    const status = error.message?.includes('perm') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao listar pedidos' }, { status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const user = await getServerUserFallback();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    // Validações básicas
    if (!body.buyer_organization_id) {
      return NextResponse.json({ error: 'buyer_organization_id é obrigatório' }, { status: 400 });
    }
    if (!body.items || !Array.isArray(body.items) || body.items.length === 0) {
      return NextResponse.json({ error: 'Pelo menos um item é obrigatório' }, { status: 400 });
    }

    // TODO: Implementar criação de pedido com itens
    // Por enquanto retorna erro de não implementado
    return NextResponse.json({ error: 'Criação de pedidos será implementada na próxima etapa' }, { status: 501 });
  } catch (error: any) {
    console.error('[api/orders] POST error:', error);
    const status = error.message?.includes('perm') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao criar pedido' }, { status });
  }
}