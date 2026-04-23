'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { mapToDbStatus } from '@/lib/orderStatus';
import { decreaseStock } from '@/lib/products';

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
)
{
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

  // Se houver a chave SERVICE ROLE disponível no ambiente, crie um cliente admin
  // para operações server-side que precisam contornar RLS (inserts/updates críticos).
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

  // Resolve owner de forma resiliente para evitar FK em orders.user_id:
  // ownerId pode vir como profile.id (usuário) OU company.id (empresa).
  let effectiveOwnerId = ownerId;
  let resolvedCompanyId: string | null = null;
  try {
    const client = adminSupabase ?? supabase;

    // 1) Primeiro, tenta interpretar ownerId como profile.id
    const { data: profileById } = await client
      .from('profiles')
      .select('id, company_id, role, created_at')
      .eq('id', ownerId)
      .maybeSingle();

    if ((profileById as any)?.id) {
      effectiveOwnerId = String((profileById as any).id);
      resolvedCompanyId = ((profileById as any).company_id as string) || null;
    } else {
      // 2) Se não existe profile com esse id, tratamos ownerId como company.id
      const { data: ownerProfiles } = await client
        .from('profiles')
        .select('id, role, company_id, created_at')
        .eq('company_id', ownerId)
        .in('role', ['admin_company', 'master', 'admin', 'representante', 'representative'])
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

    // 3) Fallback adicional para rota de representante: usar sellerId -> company_id -> admin_company
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
          .in('role', ['admin_company', 'master', 'admin', 'representante', 'representative'])
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
  } catch {
    // fallback: mantém ownerId original
  }

  // Fallback final: garantir que orders.user_id aponte para um auth.users válido.
  // Em catálogos de representante, profiles.id pode não existir em auth.users.
  try {
    const client = adminSupabase ?? supabase;

    const candidateIds = new Set<string>();
    if (effectiveOwnerId) candidateIds.add(String(effectiveOwnerId));
    if (ownerId) candidateIds.add(String(ownerId));
    if (sellerId) candidateIds.add(String(sellerId));

    // Se ownerId for company_id ou se já resolvemos company_id, prioriza companies.user_id
    const companyIdCandidate = resolvedCompanyId || (ownerIsCompany ? ownerId : null);
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
        } catch {
          // tenta próximo candidato
        }
      }

      // Busca extra por admin da empresa caso nenhum candidato direto exista no auth.users
      if (!resolvedValidAuthUserId && companyIdCandidate) {
        const { data: companyProfiles } = await client
          .from('profiles')
          .select('id, role, created_at')
          .eq('company_id', companyIdCandidate)
          .in('role', ['admin_company', 'master', 'admin', 'representative', 'rep'])
          .order('created_at', { ascending: true })
          .limit(20);

        for (const p of companyProfiles || []) {
          try {
            const authRes = await adminAuth.getUserById(String((p as any).id));
            if ((authRes as any)?.data?.user?.id) {
              resolvedValidAuthUserId = String((authRes as any).data.user.id);
              break;
            }
          } catch {
            // continua
          }
        }
      }

      if (resolvedValidAuthUserId) {
        effectiveOwnerId = resolvedValidAuthUserId;
      }
    }
  } catch (e) {
    // Em falhas de resolução, mantemos fluxo atual e deixamos validação do insert acusar erro.
  }

  let currentStage = 'start';
  let shouldPendingApproval = pendingCustomerApproval;

  try {
    // 0. Verificar status do perfil do dono da loja para impedir pedidos quando bloqueado
    try {
      const { data: profile } = await (adminSupabase ?? supabase)
        .from('profiles')
        .select('status, trial_ends_at')
        .eq('id', effectiveOwnerId)
        .maybeSingle();

      const pstatus = (profile as any)?.status || null;
      const trialEnds = (profile as any)?.trial_ends_at ? new Date((profile as any).trial_ends_at) : null;
      const now = new Date();
      const isTrialExpired = trialEnds ? now > trialEnds : false;

      if (pstatus === 'blocked') {
        return { success: false, error: 'Finalização de pedidos não permitida para esta conta.' };
      }

      if (pstatus === 'trial' && isTrialExpired) {
        // Consulta simples de controle global: se o sistema não permite checkout de trials expirados, bloqueia
        try {
          const { data: gc } = await (adminSupabase ?? supabase).from('global_configs').select('allow_trial_checkout').maybeSingle();
          if (!(gc as any)?.allow_trial_checkout) {
            return { success: false, error: 'Finalização de pedidos não permitida para contas em trial expirado.' };
          }
        } catch (e) {
          return { success: false, error: 'Finalização de pedidos não permitida para esta conta.' };
        }
      }
    } catch (e) {
      // Se falhar a verificação de status, seguir com cautela (não bloquear por falha de infra)
    }
    // 1. Busca Configurações da Loja (Estoque e Backorder) - com resiliência .maybeSingle()
    const { data: settings } = await (adminSupabase ?? supabase)
      .from('settings')
      .select('enable_stock_management, global_allow_backorder, name')
      .eq('user_id', effectiveOwnerId)
      .maybeSingle();

    // Fallbacks para valores padrão se não houver settings
    const shouldManageStock = settings?.enable_stock_management || false;
    const allowBackorder = settings?.global_allow_backorder || false;

    // 2. Validação de Estoque (Pré-venda)
    if (shouldManageStock && !allowBackorder) {
      currentStage = 'stock_validation';
      for (const item of cartItems) {
        // Se item não tem id (manual), pulamos validação
        if (!item.id) continue;
        const { data: product, error: productErr } = await supabase
          .from('products')
          .select('stock_quantity, name')
          .eq('id', item.id)
          .maybeSingle();

        if (productErr) {
          console.error('createOrder - product lookup error', {
            stage: currentStage,
            item,
            error: productErr,
          });
          throw new Error(`stock_check: Erro ao consultar produto ${item.id}`);
        }

        if (product && (product.stock_quantity || 0) < item.quantity) {
          return {
            success: false,
            error: `Estoque insuficiente para: ${product.name}. (Disponível: ${product.stock_quantity})`,
          };
        }
      }
    }

    // Se o dono da loja pertence a uma company, tentamos vincular o pedido a ela
    // Prioriza `companyIdFromPayload` quando fornecido pela rota (mais explícito)
    let companyId: string | null = companyIdFromPayload || resolvedCompanyId;
    try {
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
    } catch (e) {
      // falha ao buscar company_id — seguimos sem vínculo
      companyId = null;
    }

    if (companyId) {
      try {
        const { data: companyPolicy } = await (adminSupabase ?? supabase)
          .from('companies')
          .select('block_new_orders, require_customer_approval')
          .eq('id', companyId)
          .maybeSingle();

        const blocked = Boolean((companyPolicy as any)?.block_new_orders);
        const requireApproval =
          (companyPolicy as any)?.require_customer_approval !== false;

        if (blocked && (source === 'catalogo' || source === 'rep')) {
          return {
            success: false,
            error:
              'A distribuidora bloqueou temporariamente novos pedidos neste catalogo.',
          };
        }

        if (requireApproval && !existingCustomerId) {
          shouldPendingApproval = true;
        }
      } catch {
        // fallback seguro: se política falhar, mantém fluxo atual
      }
    }

    // 3. Criar o Pedido
    const displayId = Math.floor(Date.now() / 1000) % 1000000;

    currentStage = 'order_insert';
    const insertClient = adminSupabase ?? supabase;

    const notesParts: string[] = [];
    if (review?.paymentLabel) notesParts.push(`Condição: ${review.paymentLabel}`);
    if (typeof review?.discountPercent === 'number' && review.discountPercent > 0) notesParts.push(`Desconto: ${review.discountPercent}%`);
    if (review?.signatureUrl) notesParts.push(`Assinatura: ${review.signatureUrl}`);
    if (review?.signedAt) notesParts.push(`Assinado em: ${review.signedAt}`);
    if (review?.originTag) notesParts.push(`Origem: ${review.originTag}`);
    if (review?.device) notesParts.push(`Dispositivo: ${review.device}`);
    if (review?.ipLocation) notesParts.push(`Localização: ${review.ipLocation}`);
    const reviewNotes = notesParts.length > 0 ? notesParts.join(' | ') : null;

    // Se houver companyId, tenta vincular o pedido a um customer existente
    // ou marcar para aprovação quando for um pré-cadastro realizado pelo rep.
    let linkedCustomerId: string | null = null;
    if (companyId) {
      try {
        // if existingCustomerId provided (rep selected an existing customer), use it
        if (existingCustomerId) {
          linkedCustomerId = existingCustomerId;
        } else if (shouldPendingApproval) {
          // representative created a new customer on the spot -> leave null and let admin approve
          linkedCustomerId = null;
        } else {
          // Preferência: buscar por documento (CNPJ/CPF) quando fornecido
          if (customer.cnpj) {
            const { data: existing } = await insertClient
              .from('customers')
              .select('id')
              .eq('company_id', companyId)
              .eq('document', customer.cnpj)
              .maybeSingle();
            if (existing) linkedCustomerId = (existing as any).id;
            else {
              const { data: createdCust } = await insertClient
                .from('customers')
                .insert({
                  company_id: companyId,
                  name: customer.name,
                  email: customer.email || null,
                  phone: customer.phone || null,
                  document: customer.cnpj || null,
                })
                .select()
                .maybeSingle();
              linkedCustomerId = (createdCust as any)?.id ?? null;
            }
          } else {
            // Sem CNPJ, tentar por telefone ou email
            const phoneQ = customer.phone ? insertClient.from('customers').select('id').eq('company_id', companyId).eq('phone', customer.phone).maybeSingle() : null;
            const emailQ = customer.email ? insertClient.from('customers').select('id').eq('company_id', companyId).eq('email', customer.email).maybeSingle() : null;
            let found: any = null;
            if (phoneQ) {
              const { data } = await phoneQ;
              if (data) found = data;
            }
            if (!found && emailQ) {
              const { data } = await emailQ;
              if (data) found = data;
            }
            if (found) linkedCustomerId = (found as any).id;
            else {
              const { data: createdCust } = await insertClient
                .from('customers')
                .insert({
                  company_id: companyId,
                  name: customer.name,
                  email: customer.email || null,
                  phone: customer.phone || null,
                  document: customer.cnpj || null,
                })
                .select()
                .maybeSingle();
              linkedCustomerId = (createdCust as any)?.id ?? null;
            }
          }
        }
      } catch (e) {
        // Em caso de falha, não interromper o fluxo de compra — apenas não vinculamos
        linkedCustomerId = null;
      }
    }
    // Decide o status inicial:
    // - Se for um pedido vindo do link do cliente (client_link), marcamos como 'pending_review' (orçamento)
    // - Para pedidos vinculados a uma company, usamos 'awaiting_billing' quando não precisar revisão
    // - Caso contrário, mantemos 'pending'
    let initialStatus: string;
    // If the order originates from a representative link (sellerId + companyId),
    // require the rep to review before it reaches the distribuidora.
    if (sellerId && companyId) {
      initialStatus = mapToDbStatus('pending_review'); // 'Aguardando Revisão'
    } else if (source === 'client_link') {
      initialStatus = mapToDbStatus('pending_review');
    } else {
      initialStatus = companyId ? (shouldPendingApproval ? mapToDbStatus('pending') : mapToDbStatus('awaiting_billing')) : mapToDbStatus('pending');
    }

    const orderPayload = {
      user_id: effectiveOwnerId,
      display_id: displayId,
      status: initialStatus,
      total_value: cartItems.reduce((acc, item) => acc + item.price * item.quantity, 0),
      item_count: cartItems.reduce((acc, item) => acc + item.quantity, 0),
      client_name_guest: customer.name,
      client_phone_guest: customer.phone,
      client_email_guest: customer.email || null,
      client_cnpj_guest: customer.cnpj || null,
      company_id: companyId,
      customer_id: linkedCustomerId,
      source: source,
      seller_id: sellerId || null,
      notes: reviewNotes,
    } as any;

    let order: any = null;
    let orderError: any = null;

    // Try initial insert
    ({ data: order, error: orderError } = await insertClient.from('orders').insert(orderPayload).select().maybeSingle());

    // If insert failed due to foreign-key on user_id, attempt to resolve a profile
    if (orderError) {
      const msg = String(orderError?.message || '').toLowerCase();
      const isFkUser = msg.includes('orders_user_id_fkey') || msg.includes('foreign key') || String(orderError?.code || '').includes('23503');
      if (isFkUser && companyId) {
        try {
          // Attempt to find a profile linked to this company and use its id
          const { data: possibleProfile } = await (adminSupabase ?? supabase)
            .from('profiles')
            .select('id')
            .eq('company_id', companyId)
            .order('created_at', { ascending: true })
            .limit(1)
            .maybeSingle();
          if ((possibleProfile as any)?.id) {
            orderPayload.user_id = (possibleProfile as any).id;
            ({ data: order, error: orderError } = await insertClient.from('orders').insert(orderPayload).select().maybeSingle());
          }
        } catch (e) {
          // ignore and rethrow below
        }
      }
    }

    if (orderError) {
      console.error('createOrder - order insert error', {
        stage: currentStage,
        orderError,
      });
      throw new Error(`order_insert: ${orderError.message}`);
    }

    // 4. Inserir Itens do Pedido
    // Filtra itens manuais sem ID válido se necessário, ou insere direto se a tabela permitir nullable
    // Assumindo que order_items requer product_id válido ou nulo:
    const orderItems = cartItems.map((item) => ({
      order_id: order.id,
      product_id: item.is_manual ? null : item.id, // Se for manual, product_id é null
      product_name: item.name,
      product_reference: item.reference_code,
      quantity: item.quantity,
      unit_price: item.price,
      total_price: item.price * item.quantity,
    }));

    currentStage = 'items_insert';
    const { error: itemsError } = await insertClient
      .from('order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('createOrder - items insert error', {
        stage: currentStage,
        itemsError,
        orderItemsLength: orderItems.length,
      });
      throw new Error(`items_insert: ${itemsError.message}`);
    }

    // 5. Baixa de Estoque
    if (shouldManageStock) {
      for (const item of cartItems) {
        if (!item.is_manual) {
          try {
            const ok = await decreaseStock(item.id, item.quantity);
            if (!ok) {
              console.error('createOrder - decreaseStock failed', { itemId: item.id });
              // Fallback to existing RPC if available
              try {
                const rpcClient = adminSupabase ?? supabase;
                const { error: stockError } = await rpcClient.rpc('decrement_stock', {
                  p_product_id: item.id,
                  p_quantity: item.quantity,
                  p_allow_backorder: allowBackorder,
                });
                if (stockError) {
                  console.error('createOrder - decrement_stock rpc error', {
                    stage: 'stock_rpc',
                    itemId: item.id,
                    stockError,
                  });
                }
              } catch (e) {
                console.error('createOrder - fallback rpc failed', { itemId: item.id, error: e });
              }
            }
          } catch (err) {
            console.error('createOrder - decreaseStock error', { itemId: item.id, error: err });
          }
        }
      }
    }

    revalidatePath('/dashboard');
    revalidatePath(`/catalog`);

    return {
      success: true,
      orderId: displayId,
      orderUuid: order.id,
      status: initialStatus,
      source,
      signatureUrl: review?.signatureUrl || null,
      clientEmail: customer.email,
      clientDocument: customer.cnpj,
    };
  } catch (error: any) {
    console.error('createOrder - caught error', {
      currentStage:
        typeof currentStage !== 'undefined' ? currentStage : 'unknown',
      message: error?.message,
    });
    return { success: false, error: error.message || 'Erro interno.' };
  }
}
