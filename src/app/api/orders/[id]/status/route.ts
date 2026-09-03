import { NextRequest, NextResponse } from 'next/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import { getOrderService } from '@/domain/orders/OrderService';
import { CommercialStatus, OperationalStatus } from '@/domain/orders/types';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getServerUserFallback();
    if (!user) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id: orderId } = await params;
    const body = await request.json();

    const domain = body.domain as 'commercial' | 'operational';
    const targetStatus = body.target_status;
    const expectedVersion = parseInt(body.expected_version, 10);
    const reason = body.reason || undefined;

    if (!domain || !targetStatus || isNaN(expectedVersion)) {
      return NextResponse.json(
        { error: 'Parâmetros obrigatórios: domain, target_status, expected_version' },
        { status: 400 }
      );
    }

    const service = getOrderService();
    let result;

    if (domain === 'commercial') {
      switch (targetStatus) {
        case CommercialStatus.SUBMITTED:
        case 'submitted':
          result = await service.submitForApproval(user.id, orderId, expectedVersion, reason);
          break;
        case CommercialStatus.UNDER_REVIEW:
        case 'under_review':
          result = await service.sendToCreditReview(user.id, orderId, expectedVersion, reason);
          break;
        case CommercialStatus.APPROVED:
        case 'approved':
          result = await service.approveOrder(user.id, orderId, expectedVersion, reason);
          break;
        case CommercialStatus.REJECTED:
        case 'rejected':
          result = await service.rejectOrder(user.id, orderId, expectedVersion, reason);
          break;
        case CommercialStatus.CANCELLED:
        case 'cancelled':
          result = await service.cancelOrder(user.id, orderId, expectedVersion, reason);
          break;
        default:
          throw new Error(`Status comercial não reconhecido: ${targetStatus}`);
      }
    } else if (domain === 'operational') {
      switch (targetStatus) {
        case OperationalStatus.PROCESSING:
        case 'processing':
          result = await service.startFulfillment(user.id, orderId, expectedVersion, reason);
          break;
        case OperationalStatus.SHIPPED:
        case 'shipped':
          result = await service.shipOrder(user.id, orderId, expectedVersion, body.tracking_code, reason);
          break;
        case OperationalStatus.DELIVERED:
        case 'delivered':
          result = await service.deliverOrder(user.id, orderId, expectedVersion, reason);
          break;
        case OperationalStatus.CANCELLED:
        case 'cancelled':
          result = await service.cancelOrder(user.id, orderId, expectedVersion, reason);
          break;
        default:
          throw new Error(`Status operacional não reconhecido: ${targetStatus}`);
      }
    } else {
      return NextResponse.json({ error: 'Domínio inválido (deve ser commercial ou operational)' }, { status: 400 });
    }

    return NextResponse.json({ data: result });
  } catch (error: any) {
    console.error('[API /api/orders/[id]/status PATCH] Erro:', error);
    const isConcurrency = error.message?.includes('CONFLICT_VERSION');
    return NextResponse.json(
      { error: error.message || 'Erro ao transicionar status do pedido' },
      { status: isConcurrency ? 409 : 400 }
    );
  }
}
