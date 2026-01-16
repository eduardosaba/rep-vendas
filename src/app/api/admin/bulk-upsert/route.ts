import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const products = body?.products;
    if (!Array.isArray(products)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return NextResponse.json(
        { error: 'Server not configured' },
        { status: 500 }
      );
    }

    const supabase = createServiceClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY
    );

    // Perform upsert using service role key so RLS won't block admin ops.
    const { error } = await supabase
      .from('products')
      .upsert(products, { onConflict: 'id' });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    try {
      const authHeader = req.headers.get('authorization') || '';
      const token = authHeader.replace(/^Bearer\s+/i, '');
      let actorId: string | null = null;
      if (token) {
        const { data: userResp } = await supabase.auth.getUser(token as any);
        actorId = (userResp as any)?.user?.id || null;
      }

      const cookieStore = await cookies();
      const impersonatedId =
        cookieStore.get('impersonate_user_id')?.value || null;

      const count = products.length;
      const brands = Array.from(
        new Set(products.map((p: any) => p.brand).filter(Boolean))
      );
      const userIds = Array.from(
        new Set(products.map((p: any) => p.user_id).filter(Boolean))
      );

      await supabase.from('activity_logs').insert({
        user_id: impersonatedId || actorId,
        impersonator_id: impersonatedId ? actorId : null,
        action_type: 'BULK_UPSERT',
        description: `Upsert de ${count} produto(s) via Bulk Edit`,
        metadata: { count, brands, user_ids: userIds },
      });
    } catch (logErr) {
      console.warn('Failed to write activity log for bulk-upsert', logErr);
    }

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
