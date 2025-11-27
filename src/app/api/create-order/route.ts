import { NextResponse } from 'next/server';
import { createOrder } from '@/app/catalog/actions';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { storeOwnerId, customer, cartItems } = body;
    if (!storeOwnerId || !customer || !cartItems) {
      return NextResponse.json(
        { success: false, message: 'Missing payload' },
        { status: 400 }
      );
    }

    const result = await createOrder(
      storeOwnerId,
      customer,
      cartItems as any[]
    );
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json(
      { success: false, message: error?.message || 'Error' },
      { status: 500 }
    );
  }
}
