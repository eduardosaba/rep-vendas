import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    // 1. Verificação de Segurança: Somente usuários Master
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user)
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'master') {
      return NextResponse.json(
        { error: 'Acesso restrito a administradores' },
        { status: 403 }
      );
    }

    // 2. Captura dos dados enviados pelo Modal do Dashboard
    const body = await request.json();
    const { templateProductId, newPrice, state } = body || {};

    if (!templateProductId || newPrice == null || !state) {
      return NextResponse.json(
        { error: 'Dados insuficientes para sincronização' },
        { status: 400 }
      );
    }

    // 3. Chamada da RPC (Função SQL) que criamos no Supabase
    const { data: affectedRows, error: rpcError } = await supabase.rpc(
      'sync_cloned_prices_by_state',
      {
        p_template_product_id: templateProductId,
        p_new_price: newPrice,
        p_state: state,
      }
    );

    if (rpcError) {
      console.error('Erro na RPC de Sync:', rpcError);
      return NextResponse.json({ error: rpcError.message }, { status: 500 });
    }

    // 4. Retorno de sucesso com o número de representantes afetados
    return NextResponse.json({
      success: true,
      affectedRows,
      message: `${affectedRows} produtos atualizados em ${state}.`,
    });
  } catch (err: any) {
    console.error('sync-by-state error', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno' },
      { status: 500 }
    );
  }
}
