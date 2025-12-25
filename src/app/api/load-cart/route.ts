import { createClient } from '@/lib/supabase/server';
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

  // Uso correto da função unificada
  const supabase = await createClient();

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

  return NextResponse.json({ success: true, items: data.items });
}
