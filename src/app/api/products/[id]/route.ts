import { createRouteSupabase } from '@/lib/supabase/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import { getProductService } from '@/domain/catalog/ProductService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRouteSupabase();
    const user = await getServerUserFallback();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const service = getProductService();
    const product = await service.getProduct(id, user.id);

    if (!product) {
      return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error: any) {
    console.error('[api/products/[id]] GET error:', error);
    const status = error.message?.includes('perm') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao buscar produto' }, { status });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRouteSupabase();
    const user = await getServerUserFallback();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const service = getProductService();

    // Remover campos que não devem ser atualizados diretamente
    const { id: _, user_id, organization_id, company_id, created_at, updated_at, ...updates } = body;

    const product = await service.updateProduct(user.id, id, updates);

    return NextResponse.json(product);
  } catch (error: any) {
    console.error('[api/products/[id]] PUT error:', error);
    const status = error.message?.includes('perm') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao atualizar produto' }, { status });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createRouteSupabase();
    const user = await getServerUserFallback();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;

    const service = getProductService();
    await service.deleteProduct(user.id, id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[api/products/[id]] DELETE error:', error);
    const status = error.message?.includes('perm') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao excluir produto' }, { status });
  }
}