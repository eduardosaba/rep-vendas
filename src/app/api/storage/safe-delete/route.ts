import { NextResponse } from 'next/server';
import createRouteSupabase from '@/lib/supabase/server';
import { deleteImageIfUnused } from '@/lib/storage';

type Body = {
  paths?: string[];
  stagingIds?: string[];
  bucket?: string;
};

export async function POST(req: Request) {
  try {
    const body: Body = await req.json();
    const paths = Array.isArray(body?.paths) ? body!.paths : [];
    const stagingIds = Array.isArray(body?.stagingIds) ? body!.stagingIds : [];
    const bucket = body?.bucket || 'product-images';

    if (paths.length === 0 && stagingIds.length === 0) {
      return NextResponse.json({ error: 'no_paths_or_ids' }, { status: 400 });
    }

    const supabase = await createRouteSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const results: { path: string; success: boolean; error?: string }[] = [];

    for (const p of paths) {
      try {
        const res = await deleteImageIfUnused(supabase, bucket, p);
        results.push({ path: p, success: res.success, error: res.error });
      } catch (e: any) {
        results.push({ path: p, success: false, error: String(e) });
      }
    }

    // Remove staging entries server-side if requested (ensures DB + storage in sync)
    if (stagingIds.length > 0) {
      try {
        await supabase
          .from('staging_images')
          .delete()
          .in('id', stagingIds)
          .eq('user_id', user.id);
      } catch (e) {
        // ignore; client will refresh state
      }
    }

    return NextResponse.json({ success: true, results });
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const runtime = 'nodejs';
