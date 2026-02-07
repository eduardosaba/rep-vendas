import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

/**
 * API Route: Sync catalog updates to representatives
 * POST /api/admin/sync-catalog-updates
 *
 * Body:
 * {
 *   "source_user_id": "uuid",
 *   "brands": ["Nike", "Adidas"] // optional - if omitted, syncs all brands
 * }
 *
 * Returns:
 * {
 *   "success": true,
 *   "results": [
 *     { "target_user_id": "uuid", "target_email": "rep@example.com", "products_added": 5 }
 *   ]
 * }
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { source_user_id, brands } = body;

    if (!source_user_id) {
      return NextResponse.json(
        { error: 'source_user_id is required' },
        { status: 400 }
      );
    }

    // Use service role client for admin operations
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Service credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Determine which function to call based on whether brands are specified
    const functionName =
      brands && brands.length > 0
        ? 'sync_catalog_updates_by_brand'
        : 'sync_catalog_updates_to_all_clones';

    const params =
      brands && brands.length > 0
        ? { source_user_id, target_brands: brands }
        : { source_user_id, brands_to_sync: null };

    const { data, error } = await supabase.rpc(functionName, params);

    if (error) {
      console.error('Sync catalog updates error:', error);
      throw error;
    }

    console.log(
      `✅ Synced catalog updates from ${source_user_id} to ${data?.length || 0} targets`
    );

    return NextResponse.json({
      success: true,
      results: data || [],
      message: `Synchronized to ${data?.length || 0} representatives`,
    });
  } catch (err: any) {
    console.error('API /admin/sync-catalog-updates error:', err);
    return NextResponse.json(
      {
        error: err?.message || 'Failed to sync catalog updates',
        details: err?.details || null,
      },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/sync-catalog-updates?source_user_id=xxx
 * Returns clone summary for a source user
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const source_user_id = searchParams.get('source_user_id');

    if (!source_user_id) {
      return NextResponse.json(
        { error: 'source_user_id query parameter is required' },
        { status: 400 }
      );
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Service credentials not configured' },
        { status: 500 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data, error } = await supabase.rpc('get_clone_summary', {
      source_user_id,
    });

    if (error) throw error;

    return NextResponse.json({
      success: true,
      summary: data || [],
    });
  } catch (err: any) {
    console.error('GET /admin/sync-catalog-updates error:', err);
    return NextResponse.json(
      { error: err?.message || 'Failed to get clone summary' },
      { status: 500 }
    );
  }
}
