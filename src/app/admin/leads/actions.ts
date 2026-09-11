'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { normalizePhone } from '@/lib/phone';

export type CommercialLeadStatus = 'in_contact' | 'converted' | 'discarded';
export type SystemLeadStatus = 'lead_captured' | 'account_created' | 'onboarding_started' | 'activated';
export type LeadStatus = SystemLeadStatus | CommercialLeadStatus;

export interface LeadFilterParams {
  search?: string;
  status?: string;
  actingType?: string;
  handled?: boolean | null;
  source?: string;
  startDate?: string;
  endDate?: string;
  page?: number;
  pageSize?: number;
}

export interface LeadItem {
  id: string;
  name: string | null;
  email: string | null;
  whatsapp: string | null;
  company_name: string | null;
  acting_type: string | null;
  source: string | null;
  status: string | null;
  handled: boolean;
  user_id: string | null;
  submission_id: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface LeadMetrics {
  total: number;
  newLeads: number;
  inContact: number;
  converted: number;
  handledCount: number;
}

export interface GetAdminLeadsResult {
  success: boolean;
  leads: LeadItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  metrics: LeadMetrics;
  error?: string;
}

/**
 * Validação centralizada de permissões Master/Admin no servidor (Plataforma Global)
 */
async function requireAdminPermission() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Acesso negado. Usuário não autenticado.');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = (profile?.role || '').toString();
  // Restrição estrita: Apenas administradores globais da Torre de Controle (master / admin)
  const isAuthorized = ['master', 'admin'].includes(role);

  if (!isAuthorized) {
    throw new Error('Acesso negado. Apenas administradores globais da Torre de Controle podem gerenciar leads.');
  }

  return { user, role };
}

/**
 * Busca paginada de leads com filtros e métricas globais calculadas fora da paginação
 */
export async function getAdminLeadsAction(
  params: LeadFilterParams = {}
): Promise<GetAdminLeadsResult> {
  try {
    await requireAdminPermission();

    const supabaseAdmin = createAdminClient();

    const page = Math.max(1, params.page || 1);
    const pageSize = Math.min(100, Math.max(10, params.pageSize || 20));
    const offset = (page - 1) * pageSize;

    // 1. Métricas Globais (Calculadas sobre todo o universo de leads)
    const [totalRes, newRes, inContactRes, convertedRes, handledRes] = await Promise.all([
      supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }),
      supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'lead_captured'),
      supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'in_contact'),
      supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('status', 'converted'),
      supabaseAdmin.from('leads').select('id', { count: 'exact', head: true }).eq('handled', true),
    ]);

    const metrics: LeadMetrics = {
      total: totalRes.count || 0,
      newLeads: newRes.count || 0,
      inContact: inContactRes.count || 0,
      converted: convertedRes.count || 0,
      handledCount: handledRes.count || 0,
    };

    // 2. Consulta Filtrada Paginada
    let query = supabaseAdmin.from('leads').select('*', { count: 'exact' });

    // Filtro por busca textual (nome, e-mail, whatsapp, empresa)
    if (params.search && params.search.trim().length > 0) {
      const term = params.search.trim();
      const normPhone = normalizePhone(term);
      const searchPattern = `%${term}%`;

      if (normPhone && normPhone.length >= 8) {
        query = query.or(
          `name.ilike.${searchPattern},email.ilike.${searchPattern},company_name.ilike.${searchPattern},whatsapp.ilike.%${normPhone}%`
        );
      } else {
        query = query.or(
          `name.ilike.${searchPattern},email.ilike.${searchPattern},company_name.ilike.${searchPattern},whatsapp.ilike.${searchPattern}`
        );
      }
    }

    // Filtros de status, atuação, handled, source, datas
    if (params.status && params.status !== 'all') {
      query = query.eq('status', params.status);
    }

    if (params.actingType && params.actingType !== 'all') {
      query = query.eq('acting_type', params.actingType);
    }

    if (typeof params.handled === 'boolean') {
      query = query.eq('handled', params.handled);
    }

    if (params.source && params.source.trim().length > 0) {
      query = query.eq('source', params.source.trim());
    }

    if (params.startDate) {
      query = query.gte('created_at', params.startDate);
    }

    if (params.endDate) {
      query = query.lte('created_at', params.endDate);
    }

    // Ordenação e paginação
    query = query.order('created_at', { ascending: false }).range(offset, offset + pageSize - 1);

    const { data: leads, count, error } = await query;

    if (error) {
      throw new Error(`Erro ao consultar leads: ${error.message}`);
    }

    const totalRecords = count || 0;
    const totalPages = Math.ceil(totalRecords / pageSize) || 1;

    return {
      success: true,
      leads: (leads || []) as LeadItem[],
      total: totalRecords,
      page,
      pageSize,
      totalPages,
      metrics,
    };
  } catch (err: any) {
    return {
      success: false,
      leads: [],
      total: 0,
      page: 1,
      pageSize: 20,
      totalPages: 1,
      metrics: { total: 0, newLeads: 0, inContact: 0, converted: 0, handledCount: 0 },
      error: err?.message || 'Erro ao carregar lista de leads.',
    };
  }
}

/**
 * Atualização manual de status comercial no CRM (Restrita obrigatoriamente no backend)
 */
export async function updateLeadStatusAction(
  leadId: string,
  newStatus: string
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminPermission();

    if (!leadId || typeof leadId !== 'string') {
      return { success: false, error: 'ID de lead inválido.' };
    }

    // RESTRIÇÃO CRÍTICA DO BACKEND:
    // Bloquear qualquer tentativa manual de alterar para status automáticos do funil do sistema
    const systemStatuses = ['lead_captured', 'account_created', 'onboarding_started', 'activated'];
    if (systemStatuses.includes(newStatus)) {
      return {
        success: false,
        error: `O status '${newStatus}' é controlado automaticamente pelo sistema e não pode ser atribuído manualmente.`,
      };
    }

    const validCommercialStatuses = ['in_contact', 'converted', 'discarded'];
    if (!validCommercialStatuses.includes(newStatus)) {
      return { success: false, error: 'Status comercial inválido.' };
    }

    const supabaseAdmin = createAdminClient();
    const nowIso = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from('leads')
      .update({
        status: newStatus,
        updated_at: nowIso,
      })
      .eq('id', leadId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath('/admin/leads');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao atualizar status do lead.' };
  }
}

/**
 * Alternar a flag de atendimento humano (handled)
 */
export async function toggleLeadHandledAction(
  leadId: string,
  handled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    await requireAdminPermission();

    if (!leadId || typeof leadId !== 'string') {
      return { success: false, error: 'ID de lead inválido.' };
    }

    const supabaseAdmin = createAdminClient();
    const nowIso = new Date().toISOString();

    const { error } = await supabaseAdmin
      .from('leads')
      .update({
        handled: Boolean(handled),
        updated_at: nowIso,
      })
      .eq('id', leadId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath('/admin/leads');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao atualizar flag de atendimento.' };
  }
}

/**
 * Exclusão física excepcional de registros de spam/teste com confirmação e validações de segurança no backend
 */
export async function deleteLeadAction(leadId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { role } = await requireAdminPermission();

    if (!leadId || typeof leadId !== 'string') {
      return { success: false, error: 'ID de lead inválido.' };
    }

    const supabaseAdmin = createAdminClient();

    // 1. Verificar se o lead existe e qual o seu status atual
    const { data: existingLead, error: findErr } = await supabaseAdmin
      .from('leads')
      .select('id, status, name, email')
      .eq('id', leadId)
      .maybeSingle();

    if (findErr || !existingLead) {
      return { success: false, error: 'Lead não encontrado para exclusão.' };
    }

    // 2. Trava de Segurança no Backend:
    // Não permitir exclusão física de NENHUM lead em fluxo ativo (ex: lead_captured, activated)
    // A exclusão física só é permitida se o lead já estiver com status 'discarded' (independente de ser master ou admin)
    if (existingLead.status !== 'discarded') {
      return {
        success: false,
        error: "Exclusão física não permitida para leads em fluxo ativo. Marque o lead como 'Descartado' antes de excluir.",
      };
    }

    const { error } = await supabaseAdmin.from('leads').delete().eq('id', leadId);

    if (error) {
      throw new Error(error.message);
    }

    revalidatePath('/admin/leads');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao remover lead.' };
  }
}
