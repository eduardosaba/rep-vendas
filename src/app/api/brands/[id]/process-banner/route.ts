import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import sharp from 'sharp';

async function getAdmin() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY || !process.env.NEXT_PUBLIC_SUPABASE_URL) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_URL not configured');
  }
  return createSupabaseAdmin(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function clamp(v: number, a: number, b: number) {
  return Math.max(a, Math.min(b, v));
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const brandId = params.id;
    const supabaseAdmin = await getAdmin();

    // buscar brand
    const { data: brand } = await supabaseAdmin.from('brands').select('id, user_id, banner_path, banner_url, banner_meta').eq('id', brandId).maybeSingle();
    if (!brand) return NextResponse.json({ error: 'Brand not found' }, { status: 404 });
    if (!brand.banner_path) return NextResponse.json({ error: 'No banner_path stored' }, { status: 400 });

    // baixar arquivo
    const downloadRes = await supabaseAdmin.storage.from('product-images').download(brand.banner_path);
    if ('error' in downloadRes && downloadRes.error) {
      return NextResponse.json({ error: 'Failed to download banner' }, { status: 500 });
    }
    const arrayBuffer = await (downloadRes as any).arrayBuffer();
    const inputBuffer = Buffer.from(arrayBuffer);

    const brandNonNull = brand as any;
    const meta = brandNonNull.banner_meta || {};
    const focusX = typeof meta.focusX === 'number' ? meta.focusX : 50;
    const focusY = typeof meta.focusY === 'number' ? meta.focusY : 50;
    const zoom = typeof meta.zoom === 'number' ? meta.zoom : 100;
    const mode = meta.mode || 'fill';

    const image = sharp(inputBuffer);
    const info = await image.metadata();
    const iw = info.width || 0;
    const ih = info.height || 0;

    if (!iw || !ih) return NextResponse.json({ error: 'Invalid image' }, { status: 400 });

    async function makeVariant(targetW: number, targetH: number, nameSuffix: string) {
      // compute crop region for cover respecting focus and zoom
      const targetAspect = targetW / targetH;
      let cropW = iw;
      let cropH = ih;

      if (iw / ih > targetAspect) {
        // image is wider than target -> crop width
        cropH = ih;
        cropW = Math.round(targetAspect * cropH);
      } else {
        cropW = iw;
        cropH = Math.round(cropW / targetAspect);
      }

      // apply zoom (zoom >100 => crop smaller -> zoomed in)
      const zoomFactor = (zoom || 100) / 100;
      cropW = Math.max(1, Math.round(cropW / zoomFactor));
      cropH = Math.max(1, Math.round(cropH / zoomFactor));

      const cx = Math.round((focusX / 100) * iw);
      const cy = Math.round((focusY / 100) * ih);

      let left = Math.round(cx - cropW / 2);
      let top = Math.round(cy - cropH / 2);

      left = clamp(left, 0, Math.max(0, iw - cropW));
      top = clamp(top, 0, Math.max(0, ih - cropH));

      const buffer = await sharp(inputBuffer).extract({ left, top, width: cropW, height: cropH }).resize(targetW, targetH).webp({ quality: 80 }).toBuffer();

      const ext = 'webp';
      const filename = `brands/${brandNonNull.user_id}/${brandId}/banner-${nameSuffix}.${ext}`;
      const { error: uploadError } = await supabaseAdmin.storage.from('product-images').upload(filename, buffer, { contentType: 'image/webp', upsert: true });
      if (uploadError) throw uploadError;
      const { data: pub } = supabaseAdmin.storage.from('product-images').getPublicUrl(filename);
      return { path: filename, url: pub.publicUrl };
    }

    const desktop = await makeVariant(1400, 400, 'desktop-1400x400');
    const mobile = await makeVariant(800, 400, 'mobile-800x400');
    const thumb = await makeVariant(480, 160, 'thumb-480x160');

    const variants = { desktop, mobile, thumb };

    const { error: updateErr } = await supabaseAdmin.from('brands').update({ banner_variants: variants }).eq('id', brandId);
    if (updateErr) {
      return NextResponse.json({ error: 'Failed to update brand with variants' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, variants });
  } catch (err: any) {
    console.error('process-banner error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
