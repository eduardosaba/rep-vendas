import { NextResponse } from 'next/server';
import { createOrder } from '@/app/catalogo/actions';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createRouteSupabase } from '@/lib/supabase/server';

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
    const { storeOwnerId, companyId, customer, cartItems, source, ownerIsCompany, existingCustomerId, pendingCustomerApproval, sellerId, review } = body;
    if (!storeOwnerId || !customer || !cartItems) {
      return NextResponse.json(
        { success: false, message: 'Missing payload' },
        { status: 400 }
      );
    }
    const admin = getAdminSupabase();
    // Determine authenticated user (if any) to distinguish client-link vs rep
    let effectiveSource = source || 'catalogo';
    const isDirectSaleSource =
      String(effectiveSource).toLowerCase() === 'crm_direct' ||
      String(effectiveSource).toLowerCase() === 'crm_direct_sale';
    try {
      const supabase = await createRouteSupabase(async () => {
        // route runtime cookies handled by createRouteSupabase
        return undefined;
      });
      const { data: auth } = await supabase.auth.getUser?.();
      const authUserId = (auth as any)?.user?.id || null;
      // If a sellerId is present but requester is NOT the seller, consider this a client link (quote)
      if (!isDirectSaleSource && sellerId && authUserId && String(authUserId) !== String(sellerId)) {
        effectiveSource = 'client_link';
      }
      // If sellerId present and nobody authenticated, treat as client link as well
      if (!isDirectSaleSource && sellerId && !authUserId) effectiveSource = 'client_link';
    } catch (e) {
      // ignore — fallback will use provided source
    }

    const result = await createOrder(
      storeOwnerId,
      customer,
      cartItems as any[],
      admin as any,
      effectiveSource,
      ownerIsCompany === true || ownerIsCompany === 'true',
      existingCustomerId,
      pendingCustomerApproval === true || pendingCustomerApproval === 'true',
      sellerId,
      review,
      companyId ?? null
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
