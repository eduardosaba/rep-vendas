import { createClient } from '@/lib/supabase/server';

export async function getPendingImageStats() {
  const supabase = await createClient();

  try {
    // Count pending (products without image_path but with external_image_url or legacy image_url)
    const { count, error: countError } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .is('image_path', null)
      .or('external_image_url.not.is.null,image_url.not.is.null');

    if (countError) {
      console.error('Erro ao contar pendências:', countError);
      return { count: 0, samples: [] };
    }

    const { data: samples, error: sampleError } = await supabase
      .from('products')
      .select('id, name, external_image_url, image_url')
      .is('image_path', null)
      .or('external_image_url.not.is.null,image_url.not.is.null')
      .limit(5)
      .order('created_at', { ascending: false });

    if (sampleError) {
      console.error('Erro ao buscar amostras:', sampleError);
      return { count: count || 0, samples: [] };
    }

    const normalized = (samples || []).map((row: any) => ({
      id: row.id,
      name: row.name,
      external_image_url: row.external_image_url || row.image_url || null,
    }));

    return { count: count || 0, samples: normalized };
  } catch (err) {
    console.error('Erro em getPendingImageStats:', err);
    return { count: 0, samples: [] };
  }
}
