import { NextResponse } from 'next/server';
import { bulkUpdateFields } from '@/app/dashboard/products/actions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ids, data } = body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids required (array)' }, { status: 400 });
    }
    if (!data || typeof data !== 'object') {
      return NextResponse.json({ error: 'data object required' }, { status: 400 });
    }
    const res = await bulkUpdateFields(ids, data);
    // bulkUpdateFields may return an object or throw; if it returns an error-like object, expose it
    if (res && (res as any).error) {
      return NextResponse.json(
        { status: 'error', message: (res as any).error },
        { status: 500 }
      );
    }

    return NextResponse.json({ status: 'success', res });
  } catch (err: any) {
    console.error('[debug/bulk-update] error', err);
    // If this is a Postgres/Supabase error object, include its fields to help debugging
    const payload: any = {
      message: err?.message || String(err),
      code: err?.code || null,
      detail: err?.details || err?.detail || null,
      hint: err?.hint || null,
    };
    return NextResponse.json({ status: 'error', error: payload }, { status: 500 });
  }
}
