import { createRouteSupabase } from '@/lib/supabase/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createRouteSupabase();
    const user = await getServerUserFallback();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { ids, updates, brandId, brandName, is_active } = body;

    // 1. Atualização em massa por Marca (suporta brandId e fallback por brandName)
    if ((brandId !== undefined || brandName !== undefined) && is_active !== undefined) {
      let query = supabase
        .from('products')
        .update({ is_active, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      const targetBrand = brandName || brandId;
      if (targetBrand) {
        query = query.ilike('brand', targetBrand);
      }

      const { data, error } = await query.select('id');

      if (error) {
        console.error('Erro ao atualizar produtos por marca:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const count = data?.length || 0;
      const label = brandName || 'selecionada';
      return NextResponse.json({
        success: true,
        updatedCount: count,
        message: `${count} produto(s) da marca "${label}" foram ${is_active ? 'ativados' : 'inativados'}.`,
      });
    }

    // 2. Atualização em massa por Lista de IDs
    if (Array.isArray(ids) && ids.length > 0 && updates) {
      const { data, error } = await supabase
        .from('products')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('user_id', user.id)
        .in('id', ids)
        .select('id');

      if (error) {
        console.error('Erro ao atualizar produtos em massa por IDs:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      const count = data?.length || 0;
      return NextResponse.json({
        success: true,
        updatedCount: count,
      });
    }

    return NextResponse.json(
      { error: 'Parâmetros inválidos para atualização em massa.' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Erro na API de bulk-update:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
