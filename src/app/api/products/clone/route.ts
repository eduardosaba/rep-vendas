import { createRouteSupabase } from '@/lib/supabase/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import { getProductService } from '@/domain/catalog/ProductService';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const user = await getServerUserFallback();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { sourceProductId, targetOrganizationId, overrides } = body;

    if (!sourceProductId) {
      return NextResponse.json({ error: 'sourceProductId é obrigatório' }, { status: 400 });
    }

    const service = getProductService();
    const product = await service.cloneFromTemplate(user.id, {
      sourceProductId,
      targetOrganizationId: targetOrganizationId || undefined,
      clonedByUserId: user.id,
      overrides,
    });

    return NextResponse.json(product, { status: 201 });
  } catch (error: any) {
    console.error('[api/products/clone] POST error:', error);
    const status = error.message?.includes('perm') ? 403 : 
                   error.message?.includes('desabilitada') ? 400 : 500;
    return NextResponse.json({ error: error.message || 'Erro ao clonar produto' }, { status });
  }
}