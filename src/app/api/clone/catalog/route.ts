import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { clonarCatalogo } from '@/lib/clone/clonarCatalogo';

type Body = {
  sourceUserId: string;
  targetUserId: string;
  brandName: string;
};

export async function POST(req: Request) {
  try {
    const body: Body = await req.json();
    if (!body || !body.sourceUserId || !body.targetUserId || !body.brandName) {
      return NextResponse.json(
        { error: 'sourceUserId, targetUserId and brandName required' },
        { status: 400 }
      );
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return NextResponse.json(
        { error: 'SUPABASE_SERVICE_ROLE_KEY not configured' },
        { status: 500 }
      );
    }

    const svc = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      serviceKey,
      {
        auth: { persistSession: false },
      }
    );

    const result = await clonarCatalogo(
      svc,
      body.sourceUserId,
      body.targetUserId,
      body.brandName
    );

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export const runtime = 'nodejs';
