import { NextResponse } from 'next/server';
import { syncPublicCatalog } from '@/lib/sync-public-catalog';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      user_id,
      slug,
      store_name,
      logo_url,
      primary_color,
      secondary_color,
      footer_message,
    } = body;

    if (!user_id || !slug) {
      return NextResponse.json(
        { error: 'user_id and slug are required' },
        { status: 400 }
      );
    }

    await syncPublicCatalog(user_id, {
      slug,
      store_name,
      logo_url,
      primary_color,
      secondary_color,
      footer_message,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('API /api/public_catalogs/sync error:', err);
    return NextResponse.json(
      { error: err?.message || 'unknown' },
      { status: 500 }
    );
  }
}
