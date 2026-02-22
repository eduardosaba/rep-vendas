import { NextResponse } from 'next/server';
import { duplicateProductAction } from '@/app/actions/product-actions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { productId } = body || {};
    if (!productId) return NextResponse.json({ success: false, error: 'productId missing' }, { status: 400 });

    const res = await duplicateProductAction(String(productId));
    if (!res || !res.success) return NextResponse.json({ success: false, error: res?.error || 'dup failed' }, { status: 500 });

    return NextResponse.json({ success: true, newId: res.newId });
  } catch (e: any) {
    console.error('API duplicate error', e);
    return NextResponse.json({ success: false, error: e?.message || String(e) }, { status: 500 });
  }
}
