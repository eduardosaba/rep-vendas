import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export const runtime = 'nodejs';

export async function POST() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Tenta chamar a RPC que retorna a quantidade de rows atualizadas
    const { data, error } = await supabase.rpc('repair_product_covers_logic');

    if (error) {
      // Fallback: se a RPC não existir, executa SQL direto (menos elegante, mas útil)
      const { data: fallbackData, error: sqlError } = await supabase.rpc(
        'execute_sql',
        {
          query: `
        WITH upd AS (
          UPDATE products p
          SET image_url = COALESCE(
            (SELECT img FROM unnest(p.images) img WHERE img ILIKE '%P00.jpg%' LIMIT 1),
            p.images[1]
          )
          WHERE (p.image_url IS NULL OR p.image_url NOT ILIKE '%P00.jpg%')
          AND array_length(p.images, 1) > 0
          RETURNING 1
        ) SELECT count(*) AS updated FROM upd;
      `,
        }
      );

      if (sqlError)
        return NextResponse.json({ error: sqlError.message }, { status: 500 });

      // fallbackData pode conter a contagem dependendo do RPC 'execute_sql'
      return NextResponse.json({
        success: true,
        updated: fallbackData ?? null,
      });
    }

    return NextResponse.json({ success: true, updated: data ?? null });
  } catch (err: any) {
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
