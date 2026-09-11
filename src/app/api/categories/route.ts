import { createRouteSupabase } from '@/lib/supabase/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import { getProductService } from '@/domain/catalog/ProductService';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const user = await getServerUserFallback();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const service = getProductService();
    const categories = await service.listCategories(user.id);

    return NextResponse.json({ data: categories });
  } catch (error: any) {
    console.error('[api/categories] GET error:', error);
    const status = error.message?.includes('perm') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao listar categorias' }, { status });
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

    if (!body.name) {
      return NextResponse.json({ error: 'Nome da categoria é obrigatório' }, { status: 400 });
    }

    const service = getProductService();
    const { id, user_id, organization_id, company_id, created_at, updated_at, ...categoryData } = body;

    const category = await service.createCategory(user.id, categoryData);

    return NextResponse.json(category, { status: 201 });
  } catch (error: any) {
    console.error('[api/categories] POST error:', error);
    const status = error.message?.includes('perm') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao criar categoria' }, { status });
  }
}