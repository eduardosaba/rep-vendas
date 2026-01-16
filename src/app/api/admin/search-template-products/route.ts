import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = (searchParams.get('q') || '').trim();

    if (!query || query.length < 2) return NextResponse.json({ data: [] });

    const supabase = await createClient();

    // Buscar produtos que pertencem a usuários com role = 'template'
    const { data, error } = await supabase
      .from('products')
      .select('id, name, reference_code, price, sale_price, brand, user_id')
      .or(`name.ilike.%${query}%,reference_code.ilike.%${query}%`)
      .limit(8);

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    // Filtrar apenas produtos cujo user_id pertence a um profile.template
    const templateIdsRes = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'template');
    if (templateIdsRes.error) throw templateIdsRes.error;
    const templateIds = (templateIdsRes.data || []).map((r: any) => r.id);

    const filtered = (data || []).filter((p: any) =>
      templateIds.includes(p.user_id)
    );

    return NextResponse.json({ data: filtered });
  } catch (err: any) {
    console.error('search-template-products error', err);
    return NextResponse.json({ error: err.message || 'Erro' }, { status: 500 });
  }
}
