import { NextResponse } from 'next/server';
import { updateOrderStatus } from '@/app/admin/orders/actions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, newStatus } = body;
    if (!orderId || !newStatus) {
      return NextResponse.json({ success: false, error: 'Missing params' }, { status: 400 });
    }

    await updateOrderStatus(orderId, newStatus);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Error' }, { status: 500 });
  }
}
