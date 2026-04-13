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

function extractStoragePathFromPublicUrl(u: string) {
  try {
    const m = u.match(/\/storage\/v1\/object\/public\/(.+)$/);
    if (m && m[1]) return decodeURIComponent(m[1]);
    // fallback: if URL contains '/product-images/' extract after it
    const m2 = u.match(/product-images\/(.+)$/);
    if (m2 && m2[1]) return m2[1];
    return null;
  } catch {
    return null;
  }
}

async function processSingle(admin: any, userId: string, originalUrl: string, idx: number) {
  const path = extractStoragePathFromPublicUrl(originalUrl);
  if (!path) return null;

  const downloadRes = await admin.storage.from('product-images').download(path);
  if ('error' in downloadRes && downloadRes.error) return null;
  const ab = await (downloadRes as any).arrayBuffer();
  const buf = Buffer.from(ab);

  const makeVariant = async (w: number, h: number, suffix: string) => {
    const out = await sharp(buf).resize(w, h, { fit: 'cover' }).webp({ quality: 80 }).toBuffer();
    const filename = `settings/${userId}/banners/banner-${idx}-${suffix}.webp`;
    const { error: uploadError } = await admin.storage.from('product-images').upload(filename, out, { contentType: 'image/webp', upsert: true });
    if (uploadError) throw uploadError;
    const { data } = admin.storage.from('product-images').getPublicUrl(filename);
    return { path: filename, url: data.publicUrl };
  };

  const desktop = await makeVariant(1400, 400, 'desktop-1400x400');
  const mobile = await makeVariant(800, 400, 'mobile-800x400');
  const thumb = await makeVariant(480, 160, 'thumb-480x160');

  return { original: originalUrl, variants: { desktop, mobile, thumb } };
}

export async function POST() {
  try {
    const admin = await getAdmin();
    // iterate all users' settings? We'll process only for currently authenticated service call
    // For safety, process all settings rows with banners non-null would be heavy. Instead, require body with userId
    return NextResponse.json({ ok: false, error: 'userId required' }, { status: 400 });
  } catch (err: any) {
    console.error('process-banners error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const userId = body?.userId;
    if (!userId) return NextResponse.json({ error: 'userId required' }, { status: 400 });

    const admin = await getAdmin();
    const { data: settings } = await admin.from('settings').select('banners,banners_mobile').eq('user_id', userId).maybeSingle();
    if (!settings) return NextResponse.json({ error: 'settings not found' }, { status: 404 });

    const banners: string[] = Array.isArray(settings.banners) ? settings.banners : [];
    const bannersMobile: string[] = Array.isArray(settings.banners_mobile) ? settings.banners_mobile : [];

    const results: any = { banners: [], banners_mobile: [] };

    for (let i = 0; i < banners.length; i++) {
      try {
        const r = await processSingle(admin, userId, banners[i], i);
        if (r) results.banners.push(r);
      } catch (e) {
        console.warn('process banner item failed', banners[i], e);
      }
    }

    for (let i = 0; i < bannersMobile.length; i++) {
      try {
        const r = await processSingle(admin, userId, bannersMobile[i], i);
        if (r) results.banners_mobile.push(r);
      } catch (e) {
        console.warn('process banner mobile item failed', bannersMobile[i], e);
      }
    }

    const { error: updErr } = await admin.from('settings').update({ banner_variants: results }).eq('user_id', userId);
    if (updErr) throw updErr;

    return NextResponse.json({ ok: true, results });
  } catch (err: any) {
    console.error('process-banners PUT error', err);
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}
