import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

/**
 * API Route: Sincroniza preços do Template para toda a rede de representantes
 * Visível apenas para usuário Master
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const cookieStore = await cookies();

    // 1. Valida autenticação
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    // 2. Valida que é usuário MASTER (ignora impersonation aqui)
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'master') {
      return NextResponse.json(
        { error: 'Acesso negado. Apenas Master pode propagar preços.' },
        { status: 403 }
      );
    }

    // 3. Recebe dados do request
    const { templateProductId, newPrice, newSalePrice, syncType } =
      await request.json();

    if (!templateProductId || !syncType) {
      return NextResponse.json(
        { error: 'Campos obrigatórios: templateProductId, syncType' },
        { status: 400 }
      );
    }

    let affectedRows = 0;

    // 4. Chama RPC apropriado
    if (syncType === 'price' && newPrice !== undefined) {
      const { data, error } = await supabase.rpc('sync_cloned_prices', {
        p_template_product_id: templateProductId,
        p_new_price: newPrice,
      });

      if (error) throw error;
      affectedRows = data || 0;
    } else if (syncType === 'sale_price' && newSalePrice !== undefined) {
      const { data, error } = await supabase.rpc('sync_cloned_sale_prices', {
        p_template_product_id: templateProductId,
        p_new_sale_price: newSalePrice,
      });

      if (error) throw error;
      affectedRows = data || 0;
    } else {
      return NextResponse.json(
        { error: 'Tipo de sync inválido ou valor ausente' },
        { status: 400 }
      );
    }

    // 5. Log de auditoria
    await supabase.from('activity_logs').insert({
      user_id: user.id,
      action: `sync_template_${syncType}`,
      details: {
        templateProductId,
        newPrice: syncType === 'price' ? newPrice : undefined,
        newSalePrice: syncType === 'sale_price' ? newSalePrice : undefined,
        affectedRows,
      },
    });

    return NextResponse.json({
      success: true,
      affectedRows,
      message: `${affectedRows} representante(s) atualizado(s) com sucesso`,
    });
  } catch (error: any) {
    console.error('Erro ao sincronizar preços do template:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
