import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { Buffer } from 'buffer';

// POST { url, brandSlug?, filename? }
export async function POST(req: Request) {
  const startedAt = Date.now();
  const log = (level: 'info' | 'warn' | 'error', msg: string, meta?: any) => {
    // eslint-disable-next-line no-console
    console[level](`[import/upload-image-v2] ${msg}`, {
      ...meta,
      elapsedMs: Date.now() - startedAt,
    });
  };

  try {
    const body = await req.json();
    const { url, brandSlug: rawBrandSlug, filename } = body || {};

    if (!url) {
      log('warn', 'missing_url', { body });
      return NextResponse.json(
        { success: false, error: 'missing_url' },
        { status: 400 }
      );
    }

    // access env via globalThis to avoid linter 'process is not defined' in some toolchains
    const env = (globalThis as any).process?.env ?? {};
    const SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL || env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY =
      env.SUPABASE_SERVICE_ROLE_KEY || env.SUPABASE_SERVICE_ROLE;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      log('error', 'missing_service_key', { SUPABASE_URL: !!SUPABASE_URL });
      return NextResponse.json(
        { success: false, error: 'missing_service_key' },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY,
      { global: { fetch: (globalThis as any).fetch ?? fetch } }
    );

    const bucket = 'imported-images';

    // Ensure bucket exists (best-effort)
    try {
      // @ts-ignore
      await supabaseAdmin.storage.createBucket(bucket, { public: true });
      log('info', 'bucket_create_attempt', { bucket });
    } catch (err) {
      log('info', 'bucket_create_skipped_or_exists', {
        bucket,
        error: String(err),
      });
    }

    const normalizeSlug = (s: any) => {
      if (!s) return 'brand';
      return (
        String(s)
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 63) || 'brand'
      );
    };

    const brandSlug = normalizeSlug(rawBrandSlug || 'imported');

    // download the image (use fetch from globalThis when available)
    const fetchFn: typeof fetch = (globalThis as any).fetch ?? fetch;
    let resp: any;
    try {
      resp = await fetchFn(String(url));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      log('error', 'fetch_failed_network', { url, error: msg });
      return NextResponse.json(
        { success: false, error: 'fetch_error', detail: msg },
        { status: 502 }
      );
    }

    if (!resp || !resp.ok) {
      const status = resp?.status;
      const statusText = resp?.statusText;
      log('error', 'fetch_failed_status', { url, status, statusText });
      return NextResponse.json(
        { success: false, error: 'fetch_failed', status, statusText },
        { status: 502 }
      );
    }

    const contentType = resp.headers?.get?.('content-type') || undefined;
    const arrayBuffer = await resp.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const inferredName =
      filename || String(url).split('/')?.pop() || `img-${Date.now()}`;
    const safeName = inferredName.replace(/[^a-zA-Z0-9._-]/g, '_');

    const path = `${brandSlug}/${Date.now()}_${safeName}`;

    const { data, error } = await supabaseAdmin.storage
      .from(bucket)
      .upload(path, buffer as any, { contentType });
    if (error) {
      log('error', 'upload_failed', {
        bucket,
        path,
        error: error.message || error,
      });
      return NextResponse.json(
        { success: false, error: error.message || error },
        { status: 500 }
      );
    }

    const publicUrl = supabaseAdmin.storage.from(bucket).getPublicUrl(path)
      .data?.publicUrl;

    log('info', 'upload_success', { bucket, path, publicUrl });

    return NextResponse.json({
      success: true,
      publicUrl,
      bucket,
      path,
      filename: safeName,
      brandSlug,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // eslint-disable-next-line no-console
    console.error('[import/upload-image-v2] unexpected_error', { error: msg });
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
