import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// POST { url, brandSlug?, filename? }
export async function POST(req: Request) {
  const startedAt = Date.now();
  const log = (level: 'info' | 'warn' | 'error', msg: string, meta?: any) => {
    console[level](`[import/upload-image] ${msg}`, {
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

    const SUPABASE_URL =
      process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE;

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
      { global: { fetch } }
    );

    const bucket = 'imported-images';

    // Ensure bucket exists (best-effort)
    try {
      // FIX: Removido @ts-expect-error desnecessário que quebrava o build
      await supabaseAdmin.storage.createBucket(bucket, { public: true });
      log('info', 'bucket_create_attempt', { bucket });
    } catch (err) {
      log('info', 'bucket_create_skipped_or_exists', {
        bucket,
        error: String(err),
      });
    }

    const normalizeSlug = (s: any) => {
      if (!s) return 'imported';
      return (
        String(s)
          .normalize('NFD')
          .replace(/\p{Diacritic}/gu, '')
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, '-')
          .replace(/-+/g, '-')
          .replace(/^-|-$/g, '')
          .slice(0, 63) || 'imported'
      );
    };

    const brandSlug = normalizeSlug(rawBrandSlug || 'imported');

    // download the image
    let resp: Response;
    try {
      resp = await fetch(String(url));
    } catch (err: any) {
      log('error', 'fetch_failed_network', {
        url,
        error: err?.message ?? String(err),
      });
      return NextResponse.json(
        {
          success: false,
          error: 'fetch_error',
          detail: err?.message ?? String(err),
        },
        { status: 502 }
      );
    }

    if (!resp.ok) {
      log('error', 'fetch_failed_status', {
        url,
        status: resp.status,
        statusText: resp.statusText,
      });
      return NextResponse.json(
        {
          success: false,
          error: 'fetch_failed',
          status: resp.status,
          statusText: resp.statusText,
        },
        { status: 502 }
      );
    }

    const contentType = resp.headers.get('content-type') || undefined;
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
  } catch (err: any) {
    console.error('[import/upload-image] unexpected_error', {
      error: err?.message ?? String(err),
    });
    return NextResponse.json(
      { success: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
