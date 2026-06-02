'use server';

import { mapToDbStatus } from '@/lib/orderStatus';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

export async function createOrder(
  ownerId: string,
  customer: { name: string; phone: string; email?: string; cnpj?: string },
  cartItems: any[],
  adminSupabaseOverride: ReturnType<typeof createSupabaseClient> | null = null,
  source: string = 'catalogo',
  ownerIsCompany: boolean = false,
  existingCustomerId?: string,
  pendingCustomerApproval: boolean = false,
  sellerId?: string,
  review?: {
    paymentLabel?: string;
    discountPercent?: number;
    signatureUrl?: string | null;
    signedAt?: string | null;
    device?: string | null;
    ipLocation?: string | null;
    originTag?: string | null;
  },
  companyIdFromPayload?: string | null
) {
  const ensureSupabaseEnv = () => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      console.error(
        'Faltam variáveis de ambiente Supabase: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
      throw new Error(
        'Configuração inválida: verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    }
  };

  ensureSupabaseEnv();
  const supabase = await createClient();

  const adminKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY;
  const adminSupabase =
    adminSupabaseOverride ||
    (adminKey && process.env.NEXT_PUBLIC_SUPABASE_URL
      ? createSupabaseClient(
          String(process.env.NEXT_PUBLIC_SUPABASE_URL),
          String(adminKey)
        )
      : null);

  let effectiveOwnerId = ownerId;
  let resolvedCompanyId: string | null = null;
  try {
    const client = adminSupabase ?? supabase;

    const { data: profileById } = await client
      .from('profiles')
      .select('id, company_id, role, created_at')
      .eq('id', ownerId)
      .maybeSingle();

    if ((profileById as any)?.id) {
      effectiveOwnerId = String((profileById as any).id);
      resolvedCompanyId = ((profileById as any).company_id as string) || null;
    } else {
      const { data: ownerProfiles } = await client
        .from('profiles')
        .select('id, role, company_id, created_at')
        .eq('company_id', ownerId)
        .in('role', [
          'admin_company',
          'master',
          'admin',
          'representante',
          'representative',
        ])
        .order('created_at', { ascending: true })
        .limit(10);

      const preferredProfile =
        (ownerProfiles || []).find((p: any) => p.role === 'admin_company') ||
        (ownerProfiles || [])[0];

      if ((preferredProfile as any)?.id) {
        effectiveOwnerId = String((preferredProfile as any).id);
        resolvedCompanyId = String(ownerId);
      }
    }

    if (!resolvedCompanyId && sellerId) {
      const { data: sellerProfile } = await client
        .from('profiles')
        .select('id, company_id')
        .eq('id', sellerId)
        .maybeSingle();

      const sellerCompanyId = (sellerProfile as any)?.company_id || null;
      if (sellerCompanyId) {
        resolvedCompanyId = String(sellerCompanyId);
        const { data: companyOwner } = await client
          .from('profiles')
          .select('id, role, created_at')
          .eq('company_id', sellerCompanyId)
          .in('role', [
            'admin_company',
            'master',
            'admin',
            'representante',
            'representative',
          ])
          .order('created_at', { ascending: true })
          .limit(10);

        const preferredOwner =
          (companyOwner || []).find((p: any) => p.role === 'admin_company') ||
          (companyOwner || [])[0];

        if ((preferredOwner as any)?.id) {
          effectiveOwnerId = String((preferredOwner as any).id);
        }
      }
    }
  } catch {}

  try {
    const client = adminSupabase ?? supabase;
    const candidateIds = new Set<string>();
    if (effectiveOwnerId) candidateIds.add(String(effectiveOwnerId));
    if (ownerId) candidateIds.add(String(ownerId));
    if (sellerId) candidateIds.add(String(sellerId));

    const companyIdCandidate =
      resolvedCompanyId || (ownerIsCompany ? ownerId : null);
    if (companyIdCandidate) {
      const { data: companyRow } = await client
        .from('companies')
        .select('id, user_id')
        .eq('id', companyIdCandidate)
        .maybeSingle();
      const companyUserId = (companyRow as any)?.user_id;
      if (companyUserId) candidateIds.add(String(companyUserId));
    }

    const adminAuth = (adminSupabase as any)?.auth?.admin;
    if (adminAuth?.getUserById) {
      let resolvedValidAuthUserId: string | null = null;
      for (const cid of Array.from(candidateIds)) {
        try {
          const authRes = await adminAuth.getUserById(String(cid));
          if ((authRes as any)?.data?.user?.id) {
            resolvedValidAuthUserId = String((authRes as any).data.user.id);
            break;
          }
        } catch {}
      }
      if (resolvedValidAuthUserId) {
        effectiveOwnerId = resolvedValidAuthUserId;
      }
    }
  } catch (e) {}

  let currentStage = 'start';
  let shouldPendingApproval = pendingCustomerApproval;

  try {
    const { data: settings } = await (adminSupabase ?? supabase)
      .from('settings')
      .select('enable_stock_management, global_allow_backorder, name')
      .eq('user_id', effectiveOwnerId)
      .maybeSingle();

    const shouldManageStock = settings?.enable_stock_management || false;
    const allowBackorder = settings?.global_allow_backorder || false;

    if (shouldManageStock && !allowBackorder) {
      currentStage = 'stock_validation';

      for (const item of cartItems) {
        const productId = item.product_id || item.id;
        if (!productId) continue;

        const { data: product } = await supabase
          .from('products')
          .select('stock_quantity, name')
          .eq('id', productId)
          .maybeSingle();

        if (product && (product.stock_quantity || 0) < item.quantity) {
          return {
            success: false,
            error: `Estoque insuficiente para: ${product.name}.`,
          };
        }
      }
    }

    let companyId: string | null = companyIdFromPayload || resolvedCompanyId;

    if (!companyId && ownerIsCompany) {
      companyId = ownerId;
    } else if (!companyId) {
      const { data: ownerProfile } = await (adminSupabase ?? supabase)
        .from('profiles')
        .select('company_id')
        .eq('id', effectiveOwnerId)
        .maybeSingle();

      companyId = (ownerProfile as any)?.company_id ?? null;
    }

    if (companyId) {
      const { data: companyPolicy } = await (adminSupabase ?? supabase)
        .from('companies')
        .select('block_new_orders, require_customer_approval')
        .eq('id', companyId)
        .maybeSingle();

      if (
        companyPolicy &&
        (companyPolicy as any).block_new_orders &&
        (source === 'catalogo' || source === 'rep')
      ) {
        return {
          success: false,
          error: 'A distribuidora bloqueou temporariamente novos pedidos.',
        };
      }

      if (
        (companyPolicy as any)?.require_customer_approval !== false &&
        !existingCustomerId
      ) {
        shouldPendingApproval = true;
      }
    }

    const displayId = Math.floor(Date.now() / 1000) % 1000000;
    currentStage = 'order_insert';

    const insertClient = adminSupabase ?? supabase;

    const totalValue = cartItems.reduce((acc, item) => {
      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.unit_price ?? item.price ?? 0);
      return acc + unitPrice * quantity;
    }, 0);

    const orderPayload = {
      user_id: effectiveOwnerId,
      display_id: displayId,
      status: mapToDbStatus(
        sellerId && companyId ? 'pending_review' : 'pending'
      ),
      total_value: totalValue,
      client_name_guest: customer.name,
      client_phone_guest: customer.phone,
      client_email_guest: customer.email || null,
      client_cnpj_guest: customer.cnpj || null,
      company_id: companyId,
      source,
      seller_id: sellerId || null,
    };

    const { data: order, error: orderError } = await insertClient
      .from('orders')
      .insert(orderPayload)
      .select()
      .maybeSingle();

    if (orderError || !order) {
      throw new Error(
        `Erro ao inserir pedido: ${orderError?.message || 'pedido não retornado'}`
      );
    }

    const productIds = Array.from(
      new Set(
        cartItems
          .map((item) => item.product_id || item.id)
          .filter(Boolean)
          .map(String)
      )
    );

    let productsById = new Map<string, any>();

    if (productIds.length > 0) {
      const { data: productsData } = await insertClient
        .from('products')
        .select(
          'id, name, brand, reference_code, image_url, external_image_url'
        )
        .in('id', productIds);

      productsById = new Map(
        (productsData || []).map((product: any) => [
          String(product.id),
          product,
        ])
      );
    }

    const orderItems = cartItems.map((item) => {
      const productId = item.product_id || item.id || null;
      const product = productId ? productsById.get(String(productId)) : null;

      const quantity = Number(item.quantity || 1);
      const unitPrice = Number(item.unit_price ?? item.price ?? 0);

      return {
        order_id: order.id,
        product_id: productId,
        user_id: effectiveOwnerId,

        product_name:
          item.product_name || item.name || product?.name || 'Produto',

        product_reference:
          item.product_reference ||
          item.reference_code ||
          product?.reference_code ||
          null,

        quantity,
        unit_price: unitPrice,
        total_price: quantity * unitPrice,

        brand: item.brand || product?.brand || null,

        image_url: item.image_url || product?.image_url || null,

        external_image_url:
          item.external_image_url || product?.external_image_url || null,
      };
    });

    const { error: itemsError } = await insertClient
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      throw new Error(`Erro ao inserir itens do pedido: ${itemsError.message}`);
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/orders');

    return {
      success: true,
      orderId: displayId,
      orderUuid: order.id,
      id: order.id,
      display_id: displayId,
    };
  } catch (error: any) {
    console.error('createOrder error:', {
      stage: currentStage,
      error,
    });

    return {
      success: false,
      error: error?.message || 'Erro interno.',
    };
  }
}
