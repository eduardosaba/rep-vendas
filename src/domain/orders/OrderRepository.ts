import { createClient } from '@/lib/supabase/server';
import { CommercialStatus, OperationalStatus, OrderStatusHistoryEntry } from './types';

export interface B2BOrderFilter {
  organization_id?: string;
  seller_organization_id?: string;
  buyer_organization_id?: string;
  rep_user_id?: string;
  commercial_status?: CommercialStatus;
  operational_status?: OperationalStatus;
  search?: string;
  page?: number;
  page_size?: number;
}

export interface CreateB2BOrderInput {
  seller_organization_id: string;
  buyer_organization_id?: string | null;
  rep_user_id?: string | null;
  created_by_user_id: string;
  relationship_id?: string | null;
  payment_terms?: string | null;
  shipping_address?: Record<string, any> | null;
  notes?: string | null;
  items: Array<{
    product_id: string;
    quantity: number;
    unit_price: number;
    product_name_snapshot: string;
    reference_code_snapshot?: string | null;
    brand_snapshot?: string | null;
    discount_snapshot?: number;
  }>;
}

export class OrderRepository {
  /**
   * Listar pedidos B2B com escopo organizacional e paginação
   */
  static async listOrders(filters: B2BOrderFilter) {
    const supabase = await createClient();
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const limit = filters.page_size && filters.page_size > 0 ? filters.page_size : 20;
    const offset = (page - 1) * limit;

    let query = supabase
      .from('orders')
      .select('*, order_items(*)', { count: 'exact' });

    if (filters.seller_organization_id) {
      query = query.eq('seller_organization_id', filters.seller_organization_id);
    } else if (filters.buyer_organization_id) {
      query = query.eq('buyer_organization_id', filters.buyer_organization_id);
    } else if (filters.organization_id) {
      query = query.or(`seller_organization_id.eq.${filters.organization_id},buyer_organization_id.eq.${filters.organization_id}`);
    }

    if (filters.rep_user_id) {
      query = query.eq('rep_user_id', filters.rep_user_id);
    }

    if (filters.commercial_status) {
      query = query.eq('commercial_status', filters.commercial_status);
    }

    if (filters.operational_status) {
      query = query.eq('operational_status', filters.operational_status);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, count, error } = await query;
    if (error) throw new Error(`[OrderRepository.listOrders] ${error.message}`);

    const totalCount = count || 0;
    return {
      data: data || [],
      meta: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit) || 1,
      },
    };
  }

  /**
   * Buscar pedido por ID com itens e histórico de transições
   */
  static async findById(id: string) {
    const supabase = await createClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, order_items(*)')
      .eq('id', id)
      .single();

    if (error || !order) return null;

    const { data: history } = await supabase
      .from('order_status_history')
      .select('*')
      .eq('order_id', id)
      .order('created_at', { ascending: true });

    return {
      ...order,
      history: history || [],
    };
  }

  /**
   * Criar pedido B2B com itens e snapshots comerciais
   */
  static async createOrder(input: CreateB2BOrderInput) {
    const supabase = await createClient();

    // Calcula valor total dos itens
    const totalAmount = input.items.reduce((acc, item) => {
      const discount = item.discount_snapshot || 0;
      const finalPrice = Math.max(0, item.unit_price - discount);
      return acc + finalPrice * item.quantity;
    }, 0);

    // Inserção na tabela orders com version = 1 e status default
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert({
        seller_organization_id: input.seller_organization_id,
        buyer_organization_id: input.buyer_organization_id || null,
        rep_user_id: input.rep_user_id || null,
        created_by_user_id: input.created_by_user_id,
        user_id: input.created_by_user_id, // Fallback legacy
        relationship_id: input.relationship_id || null,
        total_amount: totalAmount,
        commercial_status: CommercialStatus.DRAFT,
        operational_status: OperationalStatus.PENDING_FULFILLMENT,
        version: 1,
        notes: input.notes || null,
        payment_terms: input.payment_terms || null,
        shipping_address: input.shipping_address || null,
      })
      .select()
      .single();

    if (orderErr || !order) {
      throw new Error(`[OrderRepository.createOrder] Erro ao criar pedido: ${orderErr?.message}`);
    }

    // Inserção dos itens com snapshots
    const orderItems = input.items.map((item) => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      unit_price: item.unit_price,
      total_price: Math.max(0, item.unit_price - (item.discount_snapshot || 0)) * item.quantity,
      product_name_snapshot: item.product_name_snapshot,
      reference_code_snapshot: item.reference_code_snapshot || null,
      brand_snapshot: item.brand_snapshot || null,
      seller_organization_id: input.seller_organization_id,
      unit_price_snapshot: item.unit_price,
      discount_snapshot: item.discount_snapshot || 0,
      total_snapshot: Math.max(0, item.unit_price - (item.discount_snapshot || 0)) * item.quantity,
    }));

    const { error: itemsErr } = await supabase.from('order_items').insert(orderItems);
    if (itemsErr) {
      console.error('[OrderRepository.createOrder] Erro nos itens:', itemsErr);
    }

    // Gravação de histórico inicial
    await supabase.from('order_status_history').insert({
      order_id: order.id,
      status_domain: 'commercial',
      from_status: null,
      to_status: CommercialStatus.DRAFT,
      changed_by_user_id: input.created_by_user_id,
      organization_id: input.seller_organization_id,
      order_version: 1,
      reason: 'Pedido B2B Criado',
    });

    return OrderRepository.findById(order.id);
  }

  /**
   * Atualizar status comercial ou operacional com OCC (Optimistic Concurrency Control)
   */
  static async updateStatusWithOCC(params: {
    orderId: string;
    expectedVersion: number;
    domain: 'commercial' | 'operational';
    fromStatus: string;
    toStatus: string;
    userId: string;
    organizationId?: string | null;
    reason?: string;
  }) {
    const supabase = await createClient();

    // Prepara payload de atualização com incremento de version
    const updatePayload: Record<string, any> = {
      version: params.expectedVersion + 1,
      updated_at: new Date().toISOString(),
    };

    if (params.domain === 'commercial') {
      updatePayload.commercial_status = params.toStatus;
      if (params.toStatus === CommercialStatus.SUBMITTED) updatePayload.submitted_at = new Date().toISOString();
      if (params.toStatus === CommercialStatus.APPROVED) updatePayload.approved_at = new Date().toISOString();
      if (params.toStatus === CommercialStatus.REJECTED) updatePayload.rejected_at = new Date().toISOString();
      if (params.toStatus === CommercialStatus.CANCELLED) updatePayload.cancelled_at = new Date().toISOString();
    } else {
      updatePayload.operational_status = params.toStatus;
      if (params.toStatus === OperationalStatus.SHIPPED) updatePayload.shipped_at = new Date().toISOString();
      if (params.toStatus === OperationalStatus.DELIVERED) updatePayload.delivered_at = new Date().toISOString();
      if (params.toStatus === OperationalStatus.CANCELLED) updatePayload.cancelled_at = new Date().toISOString();
    }

    // Executa UPDATE com verificação estrita de versão (OCC)
    const { data: updatedOrder, error } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', params.orderId)
      .eq('version', params.expectedVersion)
      .select()
      .single();

    if (error || !updatedOrder) {
      throw new Error(
        `CONCURRENCY_ERROR: O pedido foi modificado por outro usuário ou versão incompatível. (Versão esperada: ${params.expectedVersion})`
      );
    }

    // Grava no histórico imutável
    await supabase.from('order_status_history').insert({
      order_id: params.orderId,
      status_domain: params.domain,
      from_status: params.fromStatus,
      to_status: params.toStatus,
      changed_by_user_id: params.userId,
      organization_id: params.organizationId || updatedOrder.seller_organization_id,
      order_version: params.expectedVersion + 1,
      reason: params.reason || null,
    });

    return updatedOrder;
  }
}
