import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteSupabase } from '@/lib/supabase/server';

export async function GET() {
  try {
    const nextCookies = await cookies();
    const supabase = await createRouteSupabase(() => nextCookies);

    // Support legacy imports: some older imports stored image URLs in `image_url`.
    // We coalesce so that either `external_image_url` or `image_url` will be
    // considered a pending external image (until migration copies values).
    const { data, error } = await supabase
      .from('products')
      .select('id, name, reference_code, external_image_url, image_url')
      .is('image_path', null)
      .or('external_image_url.not.is.null,image_url.not.is.null')
      .order('id', { ascending: true });

    // Normalize: prefer external_image_url, fallback to image_url
    const normalized = (data || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      reference_code: row.reference_code,
      external_image_url: row.external_image_url || row.image_url || null,
    }));

    if (error) {
      console.error('Erro ao buscar pendentes:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ data: normalized });
  } catch (err) {
    console.error('Erro no endpoint pending-external-images:', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
