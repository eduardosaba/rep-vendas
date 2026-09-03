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

    const url = new URL(request.url);
    const page = Number(url.searchParams.get('page') || '1');
    const limit = Number(url.searchParams.get('limit') || '20');
    const search = url.searchParams.get('search') || '';
    const brand_id = url.searchParams.get('brand_id') || undefined;
    const category_id = url.searchParams.get('category_id') || undefined;
    const material = url.searchParams.get('material') || undefined;
    const fotocromatico = url.searchParams.get('fotocromatico') ? url.searchParams.get('fotocromatico') === 'true' : undefined;
    const polarizado = url.searchParams.get('polarizado') ? url.searchParams.get('polarizado') === 'true' : undefined;
    const is_active = url.searchParams.get('is_active') ? url.searchParams.get('is_active') === 'true' : undefined;
    const is_launch = url.searchParams.get('is_launch') ? url.searchParams.get('is_launch') === 'true' : undefined;
    const tipo_montagem = url.searchParams.get('tipo_montagem') || undefined;
    const is_destaque = url.searchParams.get('is_destaque') ? url.searchParams.get('is_destaque') === 'true' : undefined;
    const min_price = url.searchParams.get('min_price') ? parseFloat(url.searchParams.get('min_price')!) : undefined;
    const max_price = url.searchParams.get('max_price') ? parseFloat(url.searchParams.get('max_price')!) : undefined;
    const in_stock = url.searchParams.get('in_stock') ? url.searchParams.get('in_stock') === 'true' : undefined;
    const sort_by = url.searchParams.get('sort_by') || 'created_at';
    const sort_order = url.searchParams.get('sort_order') || 'desc';

    const service = getProductService();

    const result = await service.listProducts(user.id, {
      search,
      brand_id,
      category_id,
      material,
      fotocromatico,
      polarizado,
      is_active,
      is_launch,
      tipo_montagem,
      is_destaque,
      min_price,
      max_price,
      in_stock,
      sort_by: sort_by as any,
      sort_order: sort_order as any,
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
    console.error('[api/products] GET error:', error);
    const status = error.message?.includes('perm') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao listar produtos' }, { status });
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

    // Validar campos obrigatórios
    if (!body.name) {
      return NextResponse.json({ error: 'Nome do produto é obrigatório' }, { status: 400 });
    }

    const service = getProductService();

    // Remover campos que não devem ser passados diretamente
    const { id, user_id, organization_id, company_id, created_at, updated_at, ...productData } = body;

    const product = await service.createProduct(user.id, productData);

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('[api/products] POST error:', error);
    const status = error.message?.includes('perm') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao criar produto' }, { status });
  }
}