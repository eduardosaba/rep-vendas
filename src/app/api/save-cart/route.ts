import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteSupabase } from '@/lib/supabaseServer';
import { customAlphabet } from 'nanoid';

// Alfabeto seguro para leitura (sem 0/O, 1/I), 6 caracteres
const nanoid = customAlphabet('23456789ABCDEFGHJKLMNPQRSTUVWXYZ', 6);

export async function POST(request: Request) {
  try {
    const nextCookies = await cookies();
    const supabase = createRouteSupabase(async () => nextCookies);

    const body = await request.json();
    console.log('API save-cart body:', JSON.stringify(body));
    const { items, userId } = body || {};

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: 'Pedido vazio ou inválido' },
        { status: 400 }
      );
    }

    // Validar estrutura dos itens
    for (const item of items) {
      if (
        !item.product_id ||
        typeof item.quantity !== 'number' ||
        item.quantity <= 0
      ) {
        return NextResponse.json(
          { error: 'Itens do Pedido inválidos' },
          { status: 400 }
        );
      }
    }

    // Gerar código curto e garantir unicidade simples
    const shortId = nanoid();

    const now = new Date();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 dias
    const { data, error } = await supabase
      .from('saved_carts')
      .insert({
        short_id: shortId,
        items: items,
        user_id_owner: userId || null,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString(),
      })
      .select('short_id')
      .maybeSingle();

    if (error) {
      console.error('Erro ao salvar pedido:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'Erro ao salvar pedido' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      code: data.short_id,
      short_id: data.short_id,
    });
  } catch (err) {
    console.error('Erro na API save-cart:', err);
    return NextResponse.json(
      { error: 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
