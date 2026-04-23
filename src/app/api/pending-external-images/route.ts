import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createRouteSupabase } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export async function GET() {
  try {
    const nextCookies = await cookies();
    const supabase = await createRouteSupabase(() => nextCookies);

    // Em contexto público (catálogo), não há usuário autenticado para este fluxo.
    // Evita disparar erros de RLS/policies desnecessários.
    const { data: authData } = await supabase.auth.getUser();
    const currentUserId = authData?.user?.id;
    if (!currentUserId) {
      return NextResponse.json({ data: [], total_external: 0 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ data: [], total_external: 0 });
    }

    const admin = createSupabaseAdmin(String(supabaseUrl), String(serviceKey), {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: profile } = await admin
      .from('profiles')
      .select('company_id')
      .eq('id', currentUserId)
      .maybeSingle();

    const companyId = (profile as any)?.company_id || null;

    // 1) Fetch limited set of products that likely have external images
    // Limit is important to avoid timeouts on large catalogs
    let directQuery = admin
      .from('products')
      .select('id, name, reference_code, external_image_url, image_url')
      .is('image_path', null)
      .or('external_image_url.not.is.null,image_url.not.is.null')
      .limit(50);

    if (companyId) {
      directQuery = directQuery.or(`user_id.eq.${currentUserId},company_id.eq.${companyId}`);
    } else {
      directQuery = directQuery.eq('user_id', currentUserId);
    }

    const { data: directData, error: directErr } = await directQuery;

    if (directErr) throw directErr;

    // 2) Fetch a limited list of product_ids from product_images with pending sync
    const { data: imgs, error: imgsErr } = await admin
      .from('product_images')
      .select('product_id')
      .neq('sync_status', 'synced')
      .limit(50);

    if (imgsErr) {
      // log and continue with directData only
      console.error('Erro ao buscar product_images pendentes:', imgsErr);
    }

    let merged: any[] = Array.isArray(directData) ? [...directData] : [];

    if (Array.isArray(imgs) && imgs.length > 0) {
      const pendingIds = imgs.map((i: any) => i.product_id).filter(Boolean);
      if (pendingIds.length > 0) {
        let pFromImgsQuery = admin
          .from('products')
          .select('id, name, reference_code, external_image_url, image_url')
          .in('id', pendingIds)
          .limit(50);

        if (companyId) {
          pFromImgsQuery = pFromImgsQuery.or(`user_id.eq.${currentUserId},company_id.eq.${companyId}`);
        } else {
          pFromImgsQuery = pFromImgsQuery.eq('user_id', currentUserId);
        }

        const { data: pFromImgs, error: pFromImgsErr } = await pFromImgsQuery;

        if (pFromImgsErr) {
          console.error('Erro ao buscar produtos a partir de product_images:', pFromImgsErr);
        } else if (Array.isArray(pFromImgs)) {
          merged = merged.concat(pFromImgs);
        }
      }
    }

    // Lightweight dedupe by id and normalize
    const unique = Array.from(new Map((merged || []).map((it: any) => [it.id, it])).values());

    const data = unique.map((row: any) => ({
      id: row.id,
      name: row.name,
      reference_code: row.reference_code,
      external_image_url: row.external_image_url || row.image_url || null,
    }));

    return NextResponse.json({ data, total_external: data.length });
  } catch (err: any) {
    console.error('Erro no endpoint pending-external-images:', err);
    return NextResponse.json({ error: err?.message || 'Erro interno' }, { status: 500 });
  }
}
