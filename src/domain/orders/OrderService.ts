import { createClient } from '@/lib/supabase/server';
import { getOrganizationContextService } from '@/domain/organizations/OrganizationContextService';
import {
  CommercialStatus,
  OperationalStatus,
  OrderEventType,
  OrderTransitionResult,
  OrderStatusHistoryEntry,
} from './types';

export class OrderService {
  constructor(private client?: any) {}

  private async getSupabase() {
    return this.client || createClient();
  }

  private orgService = getOrganizationContextService();

  // ========================================================================================
  // TRANSIÇÕES COMERCIAIS
  // ========================================================================================

  /**
   * Envia pedido para aprovação (draft → submitted)
   */
  async submitForApproval(
    userId: string,
    orderId: string,
    expectedVersion: number,
    reason?: string
  ): Promise<OrderTransitionResult> {
    const supabase = await this.getSupabase();
    const context = await this.orgService.resolveOrganizationContext(userId);

    // Buscar pedido atual
    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) {
      throw new Error('Pedido não encontrado');
    }

    // Validação estrita de Concorrência Otimista (OCC)
    if (order.version !== expectedVersion) {
      throw new Error('CONFLICT_VERSION');
    }

    // Validar transição comercial
    const currentCommercial = (order.commercial_status as CommercialStatus) || CommercialStatus.DRAFT;
    if (currentCommercial !== CommercialStatus.DRAFT) {
      throw new Error(`Transição inválida: ${currentCommercial} → ${CommercialStatus.SUBMITTED}`);
    }

    const newCommercialStatus = CommercialStatus.SUBMITTED;
    const now = new Date().toISOString();

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        commercial_status: newCommercialStatus,
        status: 'Pendente',
        version: order.version + 1,
        submitted_at: now,
        updated_at: now,
      })
      .eq('id', orderId)
      .eq('version', expectedVersion)
      .select()
      .single();

    if (updateError || !updatedOrder) {
      if (updateError) console.error('[OrderService] submitForApproval update error:', updateError);
      throw new Error('CONFLICT_VERSION');
    }

    // Registrar histórico de auditoria
    await this.recordStatusHistory({
      order_id: orderId,
      status_domain: 'commercial',
      from_status: currentCommercial,
      to_status: newCommercialStatus,
      changed_by_user_id: userId,
      organization_id: context.organizationId || order.organization_id || null,
      order_version: updatedOrder.version,
      reason: reason || null,
      metadata: { legacy_status: 'Pendente' },
    });

    return {
      commercialStatus: newCommercialStatus,
      operationalStatus: null,
      eventType: OrderEventType.SUBMITTED_FOR_APPROVAL,
      expectedVersion: updatedOrder.version,
      reason,
    };
  }

  /**
   * Envia pedido para análise financeira / risco de crédito (submitted → under_review)
   */
  async sendToCreditReview(
    userId: string,
    orderId: string,
    expectedVersion: number,
    reason?: string
  ): Promise<OrderTransitionResult> {
    const supabase = await this.getSupabase();
    const context = await this.orgService.resolveOrganizationContext(userId);

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) throw new Error('Pedido não encontrado');
    if (order.version !== expectedVersion) throw new Error('CONFLICT_VERSION');

    const currentCommercial = (order.commercial_status as CommercialStatus) || CommercialStatus.SUBMITTED;
    const newCommercialStatus = CommercialStatus.UNDER_REVIEW;
    const now = new Date().toISOString();

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        commercial_status: newCommercialStatus,
        status: 'WAITING_FINANCE',
        version: order.version + 1,
        updated_at: now,
      })
      .eq('id', orderId)
      .eq('version', expectedVersion)
      .select()
      .single();

    if (updateError || !updatedOrder) throw new Error('CONFLICT_VERSION');

    await this.recordStatusHistory({
      order_id: orderId,
      status_domain: 'commercial',
      from_status: currentCommercial,
      to_status: newCommercialStatus,
      changed_by_user_id: userId,
      organization_id: context.organizationId || order.organization_id || null,
      order_version: updatedOrder.version,
      reason: reason || 'Retido para análise financeira de crédito',
      metadata: { legacy_status: 'WAITING_FINANCE' },
    });

    return {
      commercialStatus: newCommercialStatus,
      operationalStatus: null,
      eventType: OrderEventType.COMMERCIAL_STATUS_CHANGED,
      expectedVersion: updatedOrder.version,
      reason,
    };
  }

  /**
   * Aprova pedido (submitted/under_review → approved)
   */
  async approveOrder(
    userId: string,
    orderId: string,
    expectedVersion: number,
    reason?: string
  ): Promise<OrderTransitionResult> {
    const supabase = await this.getSupabase();
    const context = await this.orgService.resolveOrganizationContext(userId);

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) throw new Error('Pedido não encontrado');
    if (order.version !== expectedVersion) throw new Error('CONFLICT_VERSION');

    const currentCommercial = (order.commercial_status as CommercialStatus) || CommercialStatus.SUBMITTED;
    if (![CommercialStatus.SUBMITTED, CommercialStatus.UNDER_REVIEW, CommercialStatus.DRAFT].includes(currentCommercial)) {
      throw new Error(`Transição inválida: ${currentCommercial} → ${CommercialStatus.APPROVED}`);
    }

    const newCommercialStatus = CommercialStatus.APPROVED;
    const newOperationalStatus = OperationalStatus.PENDING_FULFILLMENT;
    const now = new Date().toISOString();

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        commercial_status: newCommercialStatus,
        operational_status: newOperationalStatus,
        status: 'Faturado',
        version: order.version + 1,
        approved_at: now,
        updated_at: now,
      })
      .eq('id', orderId)
      .eq('version', expectedVersion)
      .select()
      .single();

    if (updateError || !updatedOrder) throw new Error('CONFLICT_VERSION');

    // Histórico comercial
    await this.recordStatusHistory({
      order_id: orderId,
      status_domain: 'commercial',
      from_status: currentCommercial,
      to_status: newCommercialStatus,
      changed_by_user_id: userId,
      organization_id: context.organizationId || order.organization_id || null,
      order_version: updatedOrder.version,
      reason: reason || null,
      metadata: { legacy_status: 'Faturado' },
    });

    // Histórico operacional inicial
    await this.recordStatusHistory({
      order_id: orderId,
      status_domain: 'operational',
      from_status: null,
      to_status: newOperationalStatus,
      changed_by_user_id: userId,
      organization_id: context.organizationId || order.organization_id || null,
      order_version: updatedOrder.version,
      reason: 'Pedido Aprovado Comercial - liberado para esteira operacional',
      metadata: { legacy_status: 'Faturado' },
    });

    return {
      commercialStatus: newCommercialStatus,
      operationalStatus: newOperationalStatus,
      eventType: OrderEventType.APPROVED,
      expectedVersion: updatedOrder.version,
      reason,
    };
  }

  /**
   * Rejeita pedido (submitted/under_review → rejected)
   */
  async rejectOrder(
    userId: string,
    orderId: string,
    expectedVersion: number,
    reason?: string
  ): Promise<OrderTransitionResult> {
    const supabase = await this.getSupabase();
    const context = await this.orgService.resolveOrganizationContext(userId);

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) throw new Error('Pedido não encontrado');
    if (order.version !== expectedVersion) throw new Error('CONFLICT_VERSION');

    const currentCommercial = (order.commercial_status as CommercialStatus) || CommercialStatus.SUBMITTED;
    if (![CommercialStatus.SUBMITTED, CommercialStatus.UNDER_REVIEW].includes(currentCommercial)) {
      throw new Error(`Transição inválida: ${currentCommercial} → ${CommercialStatus.REJECTED}`);
    }

    const newCommercialStatus = CommercialStatus.REJECTED;
    const now = new Date().toISOString();

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        commercial_status: newCommercialStatus,
        status: 'Cancelado',
        version: order.version + 1,
        rejected_at: now,
        updated_at: now,
      })
      .eq('id', orderId)
      .eq('version', expectedVersion)
      .select()
      .single();

    if (updateError || !updatedOrder) throw new Error('CONFLICT_VERSION');

    await this.recordStatusHistory({
      order_id: orderId,
      status_domain: 'commercial',
      from_status: currentCommercial,
      to_status: newCommercialStatus,
      changed_by_user_id: userId,
      organization_id: context.organizationId || order.organization_id || null,
      order_version: updatedOrder.version,
      reason: reason || null,
      metadata: { legacy_status: 'Cancelado' },
    });

    return {
      commercialStatus: newCommercialStatus,
      operationalStatus: null,
      eventType: OrderEventType.REJECTED,
      expectedVersion: updatedOrder.version,
      reason,
    };
  }

  /**
   * Cancela pedido (qualquer status não terminal → cancelled)
   */
  async cancelOrder(
    userId: string,
    orderId: string,
    expectedVersion: number,
    reason?: string
  ): Promise<OrderTransitionResult> {
    const supabase = await this.getSupabase();
    const context = await this.orgService.resolveOrganizationContext(userId);

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) throw new Error('Pedido não encontrado');
    if (order.version !== expectedVersion) throw new Error('CONFLICT_VERSION');

    const currentCommercial = order.commercial_status as CommercialStatus;
    if ([CommercialStatus.CANCELLED, CommercialStatus.REJECTED].includes(currentCommercial)) {
      throw new Error('Pedido já está em status terminal');
    }

    const newCommercialStatus = CommercialStatus.CANCELLED;
    const newOperationalStatus = OperationalStatus.CANCELLED;
    const now = new Date().toISOString();

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        commercial_status: newCommercialStatus,
        operational_status: newOperationalStatus,
        status: 'Cancelado',
        version: order.version + 1,
        cancelled_at: now,
        updated_at: now,
      })
      .eq('id', orderId)
      .eq('version', expectedVersion)
      .select()
      .single();

    if (updateError || !updatedOrder) throw new Error('CONFLICT_VERSION');

    // Histórico comercial
    await this.recordStatusHistory({
      order_id: orderId,
      status_domain: 'commercial',
      from_status: currentCommercial,
      to_status: newCommercialStatus,
      changed_by_user_id: userId,
      organization_id: context.organizationId || order.organization_id || null,
      order_version: updatedOrder.version,
      reason: reason || null,
      metadata: { legacy_status: 'Cancelado' },
    });

    // Histórico operacional
    if (order.operational_status) {
      await this.recordStatusHistory({
        order_id: orderId,
        status_domain: 'operational',
        from_status: order.operational_status,
        to_status: newOperationalStatus,
        changed_by_user_id: userId,
        organization_id: context.organizationId || order.organization_id || null,
        order_version: updatedOrder.version,
        reason: 'Cancelamento Geral',
        metadata: { legacy_status: 'Cancelado' },
      });
    }

    return {
      commercialStatus: newCommercialStatus,
      operationalStatus: newOperationalStatus,
      eventType: OrderEventType.CANCELLED,
      expectedVersion: updatedOrder.version,
      reason,
    };
  }

  // ========================================================================================
  // TRANSIÇÕES OPERACIONAIS
  // ========================================================================================

  /**
   * Inicia separação (pending_fulfillment → processing)
   * REGRA DE GOVERNANÇA: Operacional só avança se comercial_status === 'approved'
   */
  async startFulfillment(
    userId: string,
    orderId: string,
    expectedVersion: number,
    reason?: string
  ): Promise<OrderTransitionResult> {
    return this.transitionOperational(
      userId,
      orderId,
      expectedVersion,
      OperationalStatus.PROCESSING,
      OrderEventType.FULFILLMENT_STARTED,
      'Em Separação',
      reason
    );
  }

  /**
   * Marca como enviado (processing → shipped)
   */
  async shipOrder(
    userId: string,
    orderId: string,
    expectedVersion: number,
    trackingCode?: string,
    reason?: string
  ): Promise<OrderTransitionResult> {
    return this.transitionOperational(
      userId,
      orderId,
      expectedVersion,
      OperationalStatus.SHIPPED,
      OrderEventType.SHIPPED,
      'Despachado',
      reason,
      trackingCode
    );
  }

  /**
   * Marca como entregue (shipped → delivered)
   */
  async deliverOrder(
    userId: string,
    orderId: string,
    expectedVersion: number,
    reason?: string
  ): Promise<OrderTransitionResult> {
    return this.transitionOperational(
      userId,
      orderId,
      expectedVersion,
      OperationalStatus.DELIVERED,
      OrderEventType.DELIVERED,
      'Entregue',
      reason
    );
  }

  /**
   * Transição operacional genérica com validações de trava e concorrência
   */
  private async transitionOperational(
    userId: string,
    orderId: string,
    expectedVersion: number,
    targetStatus: OperationalStatus,
    eventType: OrderEventType,
    legacyStatus: string,
    reason?: string,
    trackingCode?: string
  ): Promise<OrderTransitionResult> {
    const supabase = await this.getSupabase();

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) throw new Error('Pedido não encontrado');
    if (order.version !== expectedVersion) throw new Error('CONFLICT_VERSION');

    const currentCommercial = order.commercial_status as CommercialStatus;
    let currentOperational = order.operational_status as OperationalStatus;
    if ((currentOperational as string) === 'pending_fulfillment') {
      currentOperational = OperationalStatus.PENDING_FULFILLMENT;
    }
    if ((currentOperational as string) === 'processing') {
      currentOperational = OperationalStatus.PROCESSING;
    }

    // TRAVA DE GOVERNANÇA: Operacional só avança se o comercial for APPROVED
    if (currentCommercial !== CommercialStatus.APPROVED) {
      throw new Error(`Operacional só avança com pedido APROVADO comercialmente (atual: ${currentCommercial || 'Sem Status'})`);
    }

    // Validar transição operacional
    const validTransitions: Record<OperationalStatus, OperationalStatus[]> = {
      [OperationalStatus.PENDING_FULFILLMENT]: [OperationalStatus.PROCESSING, OperationalStatus.CANCELLED],
      [OperationalStatus.PROCESSING]: [OperationalStatus.SHIPPED, OperationalStatus.CANCELLED],
      [OperationalStatus.SHIPPED]: [OperationalStatus.DELIVERED],
      [OperationalStatus.DELIVERED]: [],
      [OperationalStatus.CANCELLED]: [],
    };

    if (!validTransitions[currentOperational]?.includes(targetStatus)) {
      throw new Error(`Transição operacional inválida: ${currentOperational} → ${targetStatus}`);
    }

    const now = new Date().toISOString();
    const updateData: any = {
      operational_status: targetStatus,
      status: legacyStatus,
      version: order.version + 1,
      updated_at: now,
    };

    if (trackingCode) {
      updateData.tracking_code = trackingCode;
      updateData.despachado_at = now;
    }

    if (targetStatus === OperationalStatus.SHIPPED) updateData.shipped_at = now;
    if (targetStatus === OperationalStatus.DELIVERED) updateData.delivered_at = now;

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update(updateData)
      .eq('id', orderId)
      .eq('version', expectedVersion)
      .select()
      .single();

    if (updateError || !updatedOrder) throw new Error('CONFLICT_VERSION');

    await this.recordStatusHistory({
      order_id: orderId,
      status_domain: 'operational',
      from_status: currentOperational,
      to_status: targetStatus,
      changed_by_user_id: userId,
      organization_id: order.seller_organization_id || order.organization_id || null,
      order_version: updatedOrder.version,
      reason: reason || null,
      metadata: { legacy_status: legacyStatus, tracking_code: trackingCode },
    });

    return {
      commercialStatus: null,
      operationalStatus: targetStatus,
      eventType,
      expectedVersion: updatedOrder.version,
      reason,
    };
  }

  // ========================================================================================
  // ATUALIZAÇÃO E EXCLUSÃO (CONFORME REGRAS DE AUDITORIA)
  // ========================================================================================

  /**
   * Atualização generica de campos do pedido mantendo OCC
   */
  async updateOrder(
    userId: string,
    orderId: string,
    expectedVersion: number,
    updates: Record<string, any>
  ) {
    const supabase = await this.getSupabase();

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) throw new Error('Pedido não encontrado');
    if (order.version !== expectedVersion) throw new Error('CONFLICT_VERSION');

    const now = new Date().toISOString();
    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({
        ...updates,
        version: order.version + 1,
        updated_at: now,
      })
      .eq('id', orderId)
      .eq('version', expectedVersion)
      .select()
      .single();

    if (updateError || !updatedOrder) throw new Error('CONFLICT_VERSION');
    return updatedOrder;
  }

  /**
   * Exclusão segura de pedido:
   * - Permitida APENAS se o pedido estiver em rascunho ('draft' ou sem commercial_status).
   * - Pedidos enviados para a esteira comercial ('submitted', 'under_review', 'approved', etc) NÃO podem ser excluídos fisicamente.
   */
  async deleteOrder(userId: string, orderId: string): Promise<boolean> {
    const supabase = await this.getSupabase();

    const { data: order, error: fetchError } = await supabase
      .from('orders')
      .select('id, commercial_status, version')
      .eq('id', orderId)
      .single();

    if (fetchError || !order) throw new Error('Pedido não encontrado');

    const commercial = order.commercial_status as CommercialStatus;
    if (commercial && commercial !== CommercialStatus.DRAFT) {
      throw new Error('Pedidos enviados para a esteira comercial não podem ser excluídos fisicamente. Utilize a opção de cancelamento para preservar o histórico de auditoria.');
    }

    // Deleta itens primeiro
    await supabase.from('order_items').delete().eq('order_id', orderId);
    
    // Deleta pedido rascunho
    const { error: deleteError } = await supabase.from('orders').delete().eq('id', orderId);
    if (deleteError) throw deleteError;

    return true;
  }

  // ========================================================================================
  // HISTÓRICO E CONSULTAS
  // ========================================================================================

  private async recordStatusHistory(entry: Omit<OrderStatusHistoryEntry, 'id' | 'created_at'>): Promise<void> {
    const supabase = await this.getSupabase();
    const payload = {
      order_id: entry.order_id,
      status_domain: entry.status_domain,
      from_status: entry.from_status ?? null,
      to_status: entry.to_status,
      changed_by_user_id: entry.changed_by_user_id,
      organization_id: entry.organization_id ?? null,
      order_version: entry.order_version,
      reason: entry.reason ?? null,
      metadata: entry.metadata || {},
    };
    const { error } = await supabase.from('order_status_history').insert(payload);
    if (error) {
      console.error('[OrderService] Erro ao registrar histórico:', error);
    }
  }

  async getOrderHistory(userId: string, orderId: string): Promise<OrderStatusHistoryEntry[]> {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  }

  async getOrder(userId: string, orderId: string) {
    const supabase = await this.getSupabase();
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .single();

    if (error) throw error;
    return data;
  }

  async listOrders(userId: string, filters: {
    commercial_status?: CommercialStatus;
    operational_status?: OperationalStatus;
    buyer_organization_id?: string;
    page?: number;
    page_size?: number;
  } = {}) {
    const supabase = await this.getSupabase();

    let query = supabase
      .from('orders')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    if (filters.commercial_status) {
      query = query.eq('commercial_status', filters.commercial_status);
    }
    if (filters.operational_status) {
      query = query.eq('operational_status', filters.operational_status);
    }
    if (filters.buyer_organization_id) {
      query = query.eq('buyer_organization_id', filters.buyer_organization_id);
    }

    const page = filters.page || 1;
    const pageSize = filters.page_size || 20;
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    query = query.range(from, to);

    const { data, error, count } = await query;
    if (error) throw error;

    return {
      data: data || [],
      count: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  }
}

export function getOrderService(): OrderService {
  return new OrderService();
}