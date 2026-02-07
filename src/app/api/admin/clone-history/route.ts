import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const targetUserId = searchParams.get('targetUserId');
    const limit = parseInt(searchParams.get('limit') || '100');

    if (!targetUserId) {
      return NextResponse.json(
        { error: 'targetUserId é obrigatório' },
        { status: 400 }
      );
    }

    // Get clone history
    const { data: history, error: histError } = await supabase.rpc(
      'get_clone_history',
      {
        p_target_user_id: targetUserId,
        p_limit: limit,
      }
    );

    if (histError) throw histError;

    // Get clone stats
    const { data: stats, error: statsError } = await supabase.rpc(
      'get_clone_stats',
      {
        p_target_user_id: targetUserId,
      }
    );

    if (statsError) throw statsError;

    return NextResponse.json({
      success: true,
      history: history || [],
      stats: stats?.[0] || {
        total_clones: 0,
        total_brands: 0,
        latest_clone: null,
        brands_summary: {},
      },
    });
  } catch (error: any) {
    console.error('Erro ao buscar histórico de clone:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar histórico' },
      { status: 500 }
    );
  }
}
