import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user)
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    const body = await request.json();
    const { logId } = body || {};
    if (!logId)
      return NextResponse.json({ error: 'logId necessário' }, { status: 400 });

    // Verifica se o log existe e pertence ao usuário e não está desfeito
    const { data: existing } = await supabase
      .from('sync_logs')
      .select('id, rolled_back')
      .eq('id', logId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!existing)
      return NextResponse.json(
        { error: 'Registro não encontrado' },
        { status: 404 }
      );
    if (existing.rolled_back)
      return NextResponse.json(
        { error: 'Operação já foi desfeita' },
        { status: 400 }
      );

    // Chama a RPC para realizar o rollback no banco
    const { data: rpcResult, error: rpcError } = await supabase.rpc(
      'rollback_sync_operation',
      { p_log_id: logId }
    );

    if (rpcError) {
      console.error('rollback_sync_operation error', rpcError);
      return NextResponse.json(
        { error: rpcError.message || 'Erro na RPC' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, result: rpcResult });
  } catch (err: any) {
    console.error('rollback-sync error', err);
    return NextResponse.json(
      { error: err.message || 'Erro interno' },
      { status: 500 }
    );
  }
}
