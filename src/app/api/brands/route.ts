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
    const brands = await service.listBrands(user.id);

    return NextResponse.json({ data: brands });
  } catch (error: any) {
    console.error('[api/brands] GET error:', error);
    const status = error.message?.includes('perm') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao listar marcas' }, { status });
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
      return NextResponse.json({ error: 'Nome da marca é obrigatório' }, { status: 400 });
    }

    const service = getProductService();
    const { id, user_id, organization_id, company_id, created_at, updated_at, ...brandData } = body;

    const brand = await service.createBrand(user.id, brandData);

    return NextResponse.json(brand, { status: 201 });
  } catch (error: any) {
    console.error('[api/brands] POST error:', error);
    const status = error.message?.includes('perm') ? 403 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao criar marca' }, { status });
  }
}