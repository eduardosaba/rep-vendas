import { NextResponse } from 'next/server';
import createClient from '@/lib/supabase/server';

export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Buscamos apenas os campos necessários para o diagnóstico
    const { data: products, error } = await supabase
      .from('products')
      .select('image_url, images, reference_code')
      .eq('user_id', user.id);

    if (error) throw error;

    let totalExternal = 0;
    let totalInternal = 0;
    const samplesExternal: any[] = [];
    const samplesInternal: any[] = [];

    const storageMarker = '.supabase.co/storage';

    (products || []).forEach((p: any) => {
      const imageUrl: string | null = p.image_url || null;
      const imagesArr: any[] = Array.isArray(p.images) ? p.images : [];

      // Consider product internalized if it has `image_path` (uploaded path)
      // or if the URL points to the storage marker
      const hasImagePath = !!p.image_path;

      const mainExternal = imageUrl && !imageUrl.includes(storageMarker);
      const anyArrayExternal = imagesArr.some((img) => {
        const url = typeof img === 'string' ? img : img?.url;
        return url && !url.includes(storageMarker);
      });

      // If image_path is present, treat as internal regardless of image_url
      if (hasImagePath) {
        totalInternal++;
        if (samplesInternal.length < 5)
          samplesInternal.push({
            ref: p.reference_code,
            url: imageUrl || imagesArr[0],
          });
      } else if (mainExternal || anyArrayExternal) {
        totalExternal++;
        if (samplesExternal.length < 5)
          samplesExternal.push({
            ref: p.reference_code,
            url: imageUrl || imagesArr[0],
          });
      } else if (imageUrl || imagesArr.length > 0) {
        totalInternal++;
        if (samplesInternal.length < 5)
          samplesInternal.push({
            ref: p.reference_code,
            url: imageUrl || imagesArr[0],
          });
      }
    });

    return NextResponse.json({
      total_external: totalExternal,
      total_internal: totalInternal,
      samples_external: samplesExternal,
      samples_internal: samplesInternal,
      total_checked: (products || []).length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
