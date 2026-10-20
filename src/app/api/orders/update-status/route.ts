import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { mapToDbStatus, getUiStatusKey } from '@/lib/orderStatus';
import { revalidatePath } from 'next/cache';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, newStatus, review } = body;
    if (!orderId || !newStatus) {
      return NextResponse.json(
        { error: 'orderId and newStatus are required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const normalized = mapToDbStatus(newStatus);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .maybeSingle();

    const role = String(profile?.role || '');
    const userCompanyId = profile?.company_id || null;
    const isMaster = role === 'master';
    const isElevatedRole =
      isMaster ||
      role === 'admin_company' ||
      role === 'representative' ||
      role === 'rep';

    let existingOrder: any = null;
    let existingOrderError: any = null;

    const { data: userOrder, error: userOrderErr } = await supabase
      .from('orders')
      .select('id, user_id, seller_id, company_id, notes, status, display_id')
      .eq('id', orderId)
      .maybeSingle();

    existingOrder = userOrder;
    existingOrderError = userOrderErr;

    if (!existingOrder && isElevatedRole) {
      try {
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const adminClient = createAdminClient();
        const { data: adminOrder } = await adminClient
          .from('orders')
          .select('id, user_id, seller_id, company_id, notes, status, display_id')
          .eq('id', orderId)
          .maybeSingle();
        if (adminOrder) {
          existingOrder = adminOrder;
          existingOrderError = null;
        }
      } catch (e) {
        // ignore fallback failure
      }
    }

    if (existingOrderError) {
      return NextResponse.json(
        { error: existingOrderError.message },
        { status: 500 }
      );
    }
    if (!existingOrder) {
      return NextResponse.json(
        { error: 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    const isOwner = String(existingOrder.user_id) === String(user.id);
    const isSeller = String(existingOrder.seller_id || '') === String(user.id);
    const isDistributorAdmin =
      role === 'admin_company' &&
      Boolean(userCompanyId) &&
      Boolean(existingOrder.company_id) &&
      String(existingOrder.company_id) === String(userCompanyId);

    // Determinação do modelo de gestão contratado pela distribuidora:
    // 'representative': Catálogo Digital (autonomia do representante para aprovar/confirmar)
    // 'distributor': B2B Completo (gestão centralizada com aprovação da distribuidora)
    let orderManagementMode: 'representative' | 'distributor' =
      existingOrder.order_management_mode || 'representative';

    if (!existingOrder.order_management_mode && existingOrder.company_id) {
      const { data: compRow } = await supabase
        .from('companies')
        .select('order_management_mode')
        .eq('id', existingOrder.company_id)
        .maybeSingle();
      if (compRow?.order_management_mode === 'distributor') {
        orderManagementMode = 'distributor';
      }
    }

    const isDistributorManaged =
      Boolean(existingOrder.company_id) && orderManagementMode === 'distributor';
    const canApproveDistributor = isMaster || isDistributorAdmin;
    const canManageOrder =
      isMaster || isOwner || isSeller || isDistributorAdmin;

    // 1. Verificação básica de autorização multi-tenant
    if (!canManageOrder) {
      return NextResponse.json(
        { error: 'Sem permissão para alterar este pedido' },
        { status: 403 }
      );
    }

    const currentUiStatus = getUiStatusKey(existingOrder.status);

    // 2. REGRAS DE TRANSIÇÃO E BLINDAGEM DE AUTORIZAÇÃO
    if (normalized === 'Confirmado') {
      // Exclusivo para modelo B2B Completo contratado pela distribuidora
      if (isDistributorManaged) {
        if (!canApproveDistributor) {
          return NextResponse.json(
            {
              error:
                'Aprovação não permitida: no plano B2B Completo, pedidos vinculados à distribuidora devem ser aprovados pela distribuidora responsável.',
            },
            { status: 403 }
          );
        }

        // Bloqueio de aprovação antecipada: a distribuidora só pode aprovar pedidos que já foram liberados
        if (currentUiStatus === 'pending_review') {
          return NextResponse.json(
            {
              error:
                'O pedido ainda está em revisão pelo representante e não pode ser aprovado antes da liberação.',
            },
            { status: 409 }
          );
        }
      } else {
        // Modelo Catálogo Digital (autonomia do representante) OU Representante Independente
        if (!isSeller && !isOwner && !isMaster) {
          return NextResponse.json(
            { error: 'Sem permissão para confirmar este pedido.' },
            { status: 403 }
          );
        }
      }
    }

    if (normalized === 'Entregue') {
      if (isDistributorManaged && !canApproveDistributor) {
        return NextResponse.json(
          {
            error:
              'Apenas a distribuidora responsável pode marcar este pedido como entregue no modelo B2B Completo.',
          },
          { status: 403 }
        );
      }
    }

    if (normalized === 'Pendente') {
      // Liberação de orçamento/revisão pelo representante para a distribuidora
      if (isDistributorManaged && !isSeller && !isOwner && !canApproveDistributor) {
        return NextResponse.json(
          {
            error:
              'Sem permissão para liberar este pedido para a distribuidora.',
          },
          { status: 403 }
        );
      }
    }

    let notesPatch: string | null = null;
    if (review && typeof review === 'object') {
      const pieces: string[] = [];
      if (review.paymentLabel) {
        pieces.push(`Condição: ${String(review.paymentLabel)}`);
      }
      if (
        typeof review.discountPercent === 'number' &&
        Number(review.discountPercent) > 0
      ) {
        pieces.push(`Desconto: ${Number(review.discountPercent)}%`);
      }
      notesPatch = pieces.length > 0 ? pieces.join(' | ') : null;
    }

    const mergedNotes = notesPatch
      ? [existingOrder?.notes, notesPatch].filter(Boolean).join(' | ')
      : existingOrder?.notes || null;

    // 3. Atualização garantindo validação de linhas afetadas (RLS protection e Optimistic Locking)
    let updatedRows: any[] | null = null;
    let updateError: any = null;

    const userUpdateRes = await supabase
      .from('orders')
      .update({ status: normalized, notes: mergedNotes })
      .eq('id', orderId)
      .eq('status', existingOrder.status)
      .select('id, status');

    updatedRows = userUpdateRes.data;
    updateError = userUpdateRes.error;

    // Se falhar no cliente comum e for perfil administrativo/master, tentar admin client
    if (
      (!updatedRows || updatedRows.length === 0 || updateError) &&
      (isMaster || role === 'admin_company')
    ) {
      try {
        const { createAdminClient } = await import('@/lib/supabase/admin');
        const adminClient = createAdminClient();
        const adminUpdateRes = await adminClient
          .from('orders')
          .update({ status: normalized, notes: mergedNotes })
          .eq('id', orderId)
          .eq('status', existingOrder.status)
          .select('id, status');

        if (adminUpdateRes.data && adminUpdateRes.data.length > 0) {
          updatedRows = adminUpdateRes.data;
          updateError = null;
        } else if (adminUpdateRes.error) {
          updateError = adminUpdateRes.error;
        }
      } catch (e) {
        // fallback
      }
    }

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message },
        { status: 500 }
      );
    }

    // 4. Verificação estrita de que exatamente 1 registro foi alterado
    if (!updatedRows || updatedRows.length === 0) {
      return NextResponse.json(
        {
          error:
            'Nenhuma alteração realizada. Verifique permissões de acesso ou se o pedido ainda existe.',
        },
        { status: 403 }
      );
    }

    revalidatePath('/dashboard/orders');
    if (existingOrder?.display_id) {
      revalidatePath(`/dashboard/orders/${existingOrder.display_id}`);
    }

    return NextResponse.json({
      success: true,
      newStatus: normalized,
      updatedId: updatedRows[0]?.id,
    });
  } catch (err: any) {
    console.error('orders/update-status error', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
