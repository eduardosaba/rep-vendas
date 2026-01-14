import { NextResponse } from 'next/server';
import { createOrder } from '@/app/catalogo/actions';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';

// Helper to build an admin Supabase client using service role key (server-only)
function getAdminSupabase() {
  const svc =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!svc || !url) return null;
  return createSupabaseClient(String(url), String(svc));
}

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
    const admin = getAdminSupabase();
    const result = await createOrder(
      storeOwnerId,
      customer,
      cartItems as any[],
      admin as any
    );
    if (!result || result.success === false) {
      console.error('create-order failed', {
        body: {
          storeOwnerId,
          cartItemsLength: Array.isArray(cartItems) ? cartItems.length : 0,
        },
        result,
      });
      return NextResponse.json(result, { status: 500 });
    }
    return NextResponse.json(result);
  } catch (error: any) {
    console.error('create-order route error', { error });
    return NextResponse.json(
      { success: false, message: error?.message || 'Error' },
      { status: 500 }
    );
  }
}
