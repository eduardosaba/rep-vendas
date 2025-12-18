import { cookies } from 'next/headers';
import { createRouteSupabase } from '@/lib/supabaseServer';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code')?.toUpperCase().trim();

  if (!code) {
    return NextResponse.json(
      { error: 'Código do pedido é obrigatório.' },
      { status: 400 }
    );
  }

  const nextCookies = await cookies();
  const supabase = createRouteSupabase(async () => nextCookies);

  // Buscar os itens baseados no código curto
  // Nota: usamos 'items' conforme a padronização do banco de dados
  // Resiliência: usar .maybeSingle() para não quebrar se não houver carrinho
  const { data, error } = await supabase
    .from('saved_carts')
    .select('items')
    .eq('short_id', code)
    .maybeSingle();

  if (error || !data) {
    return NextResponse.json(
      { error: 'Pedido não encontrado ou expirado.' },
      { status: 404 }
    );
  }

  // Retorna os itens para o frontend restaurar o carrinho
  return NextResponse.json({ success: true, items: data.items });
}
