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
    const context = await (service as any).orgService.resolveOrganizationContext(user.id);
    
    if (!context.organizationId) {
      return NextResponse.json({ error: 'Usuário sem organização ativa' }, { status: 403 });
    }

    const category = await (service as any).repo.findCategoryById(id, context.organizationId);

    if (!category) {
      return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
    }

    return NextResponse.json(category);
  } catch (error: any) {
    console.error('[api/categories/[id]] GET error:', error);
    const status = error.message?.includes('perm') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao buscar categoria' }, { status });
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
    const { id: _, user_id, organization_id, company_id, created_at, updated_at, ...updates } = body;

    const category = await service.updateCategory(user.id, id, updates);

    return NextResponse.json(category);
  } catch (error: any) {
    console.error('[api/categories/[id]] PUT error:', error);
    const status = error.message?.includes('perm') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao atualizar categoria' }, { status });
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
    await service.deleteCategory(user.id, id);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[api/categories/[id]] DELETE error:', error);
    const status = error.message?.includes('perm') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao excluir categoria' }, { status });
  }
}