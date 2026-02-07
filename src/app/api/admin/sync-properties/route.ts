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
    const { targetUserId, brands, properties } = body;

    // Default properties if not specified
    const propsToSync = properties || [
      'price',
      'sale_price',
      'is_active',
      'is_launch',
      'is_best_seller',
      'description',
    ];

    // Call SQL function to sync properties
    const { data, error } = await supabase.rpc(
      'sync_product_properties_to_clones',
      {
        p_source_user_id: user.id,
        p_target_user_id: targetUserId || null,
        p_brands: brands || null,
        p_properties: propsToSync,
      }
    );

    if (error) throw error;

    const result = data?.[0] || { updated_products: 0, affected_users: 0 };

    return NextResponse.json({
      success: true,
      updatedProducts: result.updated_products,
      affectedUsers: result.affected_users,
      message: `${result.updated_products} produtos atualizados em ${result.affected_users} usuário(s)`,
    });
  } catch (error: any) {
    console.error('Erro ao sincronizar propriedades:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao sincronizar propriedades' },
      { status: 500 }
    );
  }
}
