'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { revalidatePath } from 'next/cache';
import { normalizePhone } from '@/lib/phone';
import { isMaster } from '@/lib/auth/roles';

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
  // Restrição estrita: Apenas administradores globais da Torre de Controle (master)
  const isAuthorized = isMaster(role);

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

    // Sincronização idempotente: garante que perfis de representantes registrados sem lead (cadastros diretos) sejam indexados no CRM
    try {
      const { data: missingProfiles } = await supabaseAdmin
        .from('profiles')
        .select('id, full_name, email, phone, role, status, created_at')
        .in('role', ['rep', 'representative'])
        .not('email', 'is', null);

      if (missingProfiles && missingProfiles.length > 0) {
        const { data: existingLeads } = await supabaseAdmin
          .from('leads')
          .select('user_id, email');

        const existingUserIds = new Set(
          (existingLeads || []).map((l) => l.user_id).filter(Boolean)
        );
        const existingEmails = new Set(
          (existingLeads || [])
            .map((l) => l.email?.toLowerCase().trim())
            .filter(Boolean)
        );

        const toInsert: any[] = [];
        for (const p of missingProfiles) {
          const normEmail = p.email?.toLowerCase().trim();
          if (!normEmail) continue;
          if (!existingUserIds.has(p.id) && !existingEmails.has(normEmail)) {
            toInsert.push({
              name: p.full_name || normEmail.split('@')[0],
              email: normEmail,
              whatsapp: p.phone || null,
              status: p.status === 'active' ? 'converted' : 'account_created',
              source: 'direct_signup',
              user_id: p.id,
              metadata: {
                signup_channel: 'direct',
                role: p.role,
                auto_synced: true,
              },
              created_at: p.created_at || new Date().toISOString(),
              updated_at: new Date().toISOString(),
            });
          }
        }

        if (toInsert.length > 0) {
          await supabaseAdmin.from('leads').insert(toInsert);
        }
      }
    } catch (syncErr) {
      console.warn('[getAdminLeadsAction:sync-reps:warning]', syncErr);
    }

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

export interface LeadDossierPayload {
  notes?: string;
  objection?: string;
  lossReason?: string;
  nextContactDate?: string;
  nextAction?: string;
  commercialStage?: 'novo' | 'em_contato' | 'demonstracao' | 'negociacao' | 'convertido' | 'perdido';
}

/**
 * Atualiza anotações comerciais, objeções e planejamento de contato no prontuário do lead (armazena em metadata JSONB)
 */
export async function saveLeadDossierAction(
  leadId: string,
  payload: LeadDossierPayload
): Promise<{ success: boolean; error?: string }> {
  try {
    const { user } = await requireAdminPermission();

    if (!leadId || typeof leadId !== 'string') {
      return { success: false, error: 'ID de lead inválido.' };
    }

    const supabaseAdmin = createAdminClient();

    // 1. Carrega metadata atual
    const { data: lead, error: fetchErr } = await supabaseAdmin
      .from('leads')
      .select('id, metadata, status')
      .eq('id', leadId)
      .single();

    if (fetchErr || !lead) {
      return { success: false, error: 'Lead não encontrado.' };
    }

    const currentMeta = lead.metadata || {};
    const notesHistory = Array.isArray(currentMeta.notesHistory) ? [...currentMeta.notesHistory] : [];

    if (payload.notes && payload.notes.trim()) {
      notesHistory.unshift({
        id: `note-${Date.now()}`,
        text: payload.notes.trim(),
        author: user.email || 'Admin',
        createdAt: new Date().toISOString(),
      });
    }

    const updatedMetadata = {
      ...currentMeta,
      notesHistory,
      lastNote: payload.notes?.trim() || currentMeta.lastNote || null,
      objection: payload.objection || currentMeta.objection || null,
      lossReason: payload.lossReason || currentMeta.lossReason || null,
      nextContactDate: payload.nextContactDate || currentMeta.nextContactDate || null,
      nextAction: payload.nextAction || currentMeta.nextAction || null,
      commercialStage: payload.commercialStage || currentMeta.commercialStage || 'novo',
      lastDossierUpdate: new Date().toISOString(),
      lastUpdatedBy: user.email || user.id,
    };

    // Mapeia stage comercial para o status do lead se aplicável
    let mappedStatus = lead.status;
    if (payload.commercialStage === 'convertido') {
      mappedStatus = 'converted';
    } else if (payload.commercialStage === 'perdido') {
      mappedStatus = 'discarded';
    } else if (['em_contato', 'demonstracao', 'negociacao'].includes(payload.commercialStage || '')) {
      mappedStatus = 'in_contact';
    }

    const { error: updateErr } = await supabaseAdmin
      .from('leads')
      .update({
        metadata: updatedMetadata,
        status: mappedStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leadId);

    if (updateErr) {
      throw new Error(updateErr.message);
    }

    revalidatePath('/admin/leads');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao salvar prontuário do lead.' };
  }
}

/**
 * Extensão controlada de período de teste para recuperação de leads
 * Segurança: Não toca em clientes pagantes ativos (com plano comercial pago)
 */
export async function extendLeadTrialAction(
  leadId: string,
  daysToAdd: number = 7,
  reason: string = 'Recuperação de lead para teste assistido'
): Promise<{ success: boolean; newExpiration?: string; error?: string }> {
  try {
    const { user } = await requireAdminPermission();

    if (!leadId || typeof leadId !== 'string') {
      return { success: false, error: 'ID de lead inválido.' };
    }

    if (daysToAdd < 1 || daysToAdd > 30) {
      return { success: false, error: 'O período adicional deve ser entre 1 e 30 dias.' };
    }

    if (!reason || reason.trim().length < 5) {
      return { success: false, error: 'Por favor, informe a justificativa da extensão do teste.' };
    }

    const supabaseAdmin = createAdminClient();

    // 1. Busca o lead e o usuário vinculado
    const { data: lead, error: leadErr } = await supabaseAdmin
      .from('leads')
      .select('id, user_id, email, metadata')
      .eq('id', leadId)
      .single();

    if (leadErr || !lead) {
      return { success: false, error: 'Lead não encontrado.' };
    }

    if (!lead.user_id) {
      return {
        success: false,
        error: 'Este lead ainda não criou uma conta de usuário na plataforma. A extensão só pode ser aplicada a usuários cadastrados.',
      };
    }

    // 2. Proteção Crítica: Verifica assinatura existente e perfil do usuário
    const [{ data: sub }, { data: profile }] = await Promise.all([
      supabaseAdmin
        .from('subscriptions')
        .select('id, status, price, plan_name, current_period_end')
        .eq('user_id', lead.user_id)
        .maybeSingle(),
      supabaseAdmin
        .from('profiles')
        .select('id, status, role, company_id')
        .eq('id', lead.user_id)
        .maybeSingle(),
    ]);

    // Se o usuário já é um cliente pagante ativo ou membro de equipe corporativa, BLOQUEIA alteração!
    if (
      (sub && sub.status === 'active' && Number(sub.price) > 0) ||
      (profile && profile.status === 'active') ||
      (profile && Boolean(profile.company_id) && ['rep', 'representative', 'representante'].includes(String(profile.role || '').toLowerCase()))
    ) {
      return {
        success: false,
        error: 'Este usuário possui status de cliente ou membro corporativo ativo! A extensão de teste gratuito foi estritamente bloqueada para proteger o assinante.',
      };
    }

    // 3. Calcula nova data de expiração (sempre a partir de HOJE se já expirou)
    const now = new Date();
    const currentEnd = sub?.current_period_end ? new Date(sub.current_period_end) : null;
    let baseDate = now;

    if (currentEnd && currentEnd > now) {
      baseDate = currentEnd;
    }

    const newExpiration = new Date(baseDate.getTime() + daysToAdd * 24 * 60 * 60 * 1000);
    const newExpirationIso = newExpiration.toISOString();

    // 4. Atualiza subscription para status 'trial' com nova data
    const { error: subErr } = await supabaseAdmin
      .from('subscriptions')
      .upsert(
        {
          user_id: lead.user_id,
          status: 'trial',
          plan_name: 'Trial (Estendido)',
          current_period_end: newExpirationIso,
          updated_at: now.toISOString(),
        },
        { onConflict: 'user_id' }
      );

    if (subErr) {
      return { success: false, error: `Falha ao atualizar assinatura: ${subErr.message}` };
    }

    // 5. Atualiza profiles.status e profiles.trial_ends_at
    const { error: profileErr } = await supabaseAdmin
      .from('profiles')
      .update({
        status: 'trial',
        trial_ends_at: newExpirationIso,
        updated_at: now.toISOString(),
      })
      .eq('id', lead.user_id);

    if (profileErr) {
      return { success: false, error: `Falha ao atualizar perfil: ${profileErr.message}` };
    }

    // 6. Registra trilha de auditoria no metadata do lead
    const currentMeta = lead.metadata || {};
    const trialExtensions = Array.isArray(currentMeta.trialExtensions)
      ? [...currentMeta.trialExtensions]
      : [];

    trialExtensions.push({
      extendedAt: now.toISOString(),
      extendedBy: user.email || user.id,
      daysAdded: daysToAdd,
      reason: reason.trim(),
      newExpiration: newExpirationIso,
    });

    const { error: leadUpdateErr } = await supabaseAdmin
      .from('leads')
      .update({
        metadata: {
          ...currentMeta,
          trialExtensions,
          lastTrialExtension: {
            date: now.toISOString(),
            by: user.email || user.id,
            days: daysToAdd,
          },
        },
        updated_at: now.toISOString(),
      })
      .eq('id', leadId);

    if (leadUpdateErr) {
      return { success: false, error: `Falha ao registrar auditoria de extensão: ${leadUpdateErr.message}` };
    }

    revalidatePath('/admin/leads');
    revalidatePath('/admin/users');

    return {
      success: true,
      newExpiration: newExpirationIso,
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro ao estender período de teste.' };
  }
}

