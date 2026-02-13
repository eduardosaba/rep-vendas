import { NextResponse } from 'next/server';
import createRouteSupabase from '@/lib/supabase/server';
import { deleteImageIfUnused } from '@/lib/storage';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

type Body = {
  last_import_id: string;
  confirmDelete?: boolean; // se true, tenta excluir (só funciona com SERVICE_ROLE_KEY)
};

const INTERNAL_MARKER = '/storage/v1/object/public/product-images/';

async function extractPathFromPublicUrl(url: string) {
  try {
    if (!url) return null;
    const idx = url.indexOf(INTERNAL_MARKER);
    if (idx === -1) return null;
    return url.slice(idx + INTERNAL_MARKER.length);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  try {
    const body: Body = await req.json();
    if (!body || !body.last_import_id)
      return NextResponse.json(
        { error: 'last_import_id required' },
        { status: 400 }
      );

    const supabase = await createRouteSupabase();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // 1) Buscar produtos do import
    const { data: products } = await supabase
      .from('products')
      .select('id,image_url,images')
      .eq('user_id', user.id)
      .eq('last_import_id', body.last_import_id);

    const productIds = (products || []).map((p: any) => p.id).filter(Boolean);

    // 2) Buscar imagens da tabela product_images para esses produtos
    let galleryRows: any[] = [];
    if (productIds.length > 0) {
      const { data } = await supabase
        .from('product_images')
        .select('url')
        .in('product_id', productIds);
      galleryRows = data || [];
    }

    // 3) Extrair paths internos (quando internalizados no bucket product-images)
    const candidateUrls = new Set<string>();
    (products || []).forEach((p: any) => {
      if (p.image_url) candidateUrls.add(p.image_url);
      if (Array.isArray(p.images))
        p.images.forEach((u: string) => candidateUrls.add(u));
    });
    galleryRows.forEach((g) => candidateUrls.add(g.url));

    const paths = new Set<string>();
    for (const url of candidateUrls) {
      const path = await extractPathFromPublicUrl(url);
      if (path) paths.add(path);
    }

    const pathsArray = Array.from(paths);

    // Se confirmDelete for true e SERVICE role key disponível, execute exclusão
    const confirm = Boolean(body.confirmDelete);
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    let deleted: string[] = [];
    let deleteError: string | null = null;

    if (confirm) {
      if (!serviceKey) {
        return NextResponse.json(
          {
            error: 'Cannot delete: SUPABASE_SERVICE_ROLE_KEY not configured',
            paths: pathsArray,
          },
          { status: 400 }
        );
      }

      // Cria cliente com service role para remover objetos
      const svc = createSupabaseClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        serviceKey,
        {
          auth: { persistSession: false },
        }
      );

      if (pathsArray.length > 0) {
        const deletedArr: string[] = [];
        for (const p of pathsArray) {
          const res = await deleteImageIfUnused(svc, 'product-images', p);
          if (!res.success) {
            // record first error but continue trying others
            deleteError = res.error || 'failed_to_delete_some_files';
          } else {
            deletedArr.push(p);
          }
        }
        deleted = deletedArr;
      }
    }

    return NextResponse.json({
      dryRun: !confirm,
      paths: pathsArray,
      deleted,
      deleteError,
      productCount: productIds.length,
    });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const runtime = 'edge';
