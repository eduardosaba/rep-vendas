import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { targetUserId, brands } = body;

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'targetUserId é obrigatório' },
        { status: 400 }
      );
    }

    // Call SQL function to undo clone
    const { data, error } = await supabase.rpc('undo_catalog_clone', {
      p_source_user_id: user.id,
      p_target_user_id: targetUserId,
      p_brands: brands || null,
    });

    if (error) throw error;

    const deletedCount = data?.[0]?.deleted_count || 0;

    return NextResponse.json({
      success: true,
      deletedCount,
      message: `${deletedCount} produtos removidos com sucesso`,
    });
  } catch (error: any) {
    console.error('Erro ao desfazer clone:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao desfazer clone' },
      { status: 500 }
    );
  }
}
