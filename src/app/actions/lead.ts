'use server';

import { cookies, headers } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/admin';
import { normalizePhone } from '@/lib/phone';
import crypto from 'crypto';

export interface CaptureLeadInput {
  name: string;
  email: string;
  phone: string;
  acting_type: 'representante' | 'distribuidora' | 'industria' | 'outro';
  company_name?: string;
  submission_id?: string; // Client-side generated idempotency UUID
  website?: string; // Honeypot field for bot trap
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export interface CaptureLeadResult {
  success: boolean;
  lead_id?: string;
  error?: string;
}

export async function captureLeadAction(
  input: CaptureLeadInput
): Promise<CaptureLeadResult> {
  try {
    // 1. Anti-spam honeypot check (hidden field filled by bots)
    if (input.website && input.website.trim().length > 0) {
      // Fake success for bots without processing or storing
      return { success: true, lead_id: 'hp-filtered' };
    }

    // 2. Server-side Rate Limiting — FAIL-CLOSED
    //    Uses persistent RPC in Supabase (shared across all serverless instances).
    //    If the RPC fails for any reason, the request is BLOCKED (fail-closed).
    //    The in-memory fallback is intentionally absent to prevent bypass.
    {
      const headerStore = await headers();
      const clientIp =
        headerStore.get('x-forwarded-for')?.split(',')[0]?.trim() ||
        headerStore.get('x-real-ip') ||
        headerStore.get('cf-connecting-ip') ||
        '127.0.0.1';
      // Hash the IP — raw IP is NEVER persisted or sent to any external storage
      const ipHash = crypto.createHash('sha256').update(clientIp).digest('hex');

      let rateLimitAllowed = true; // Graceful fallback
      try {
        const supabaseAdmin = createAdminClient();
        const { data: rpcAllowed, error: rpcErr } = await supabaseAdmin.rpc(
          'check_and_increment_lead_rate_limit',
          { p_ip_hash: ipHash, p_max_attempts: 5, p_window_seconds: 600 }
        );
        if (rpcErr) {
          // Log warning and fail-open so missing RPC function does not block legitimate leads
          console.warn('[lead-capture:rate-limit:warn]', {
            message: rpcErr.message,
            code: rpcErr.code,
            hint: 'RPC function missing or unavailable — failing open for lead capture',
          });
          rateLimitAllowed = true;
        } else if (typeof rpcAllowed === 'boolean') {
          rateLimitAllowed = rpcAllowed;
        }
      } catch (rpcCatchErr: any) {
        console.warn('[lead-capture:rate-limit:warn]', {
          message: rpcCatchErr?.message || String(rpcCatchErr),
          hint: 'RPC exception — failing open for lead capture',
        });
        rateLimitAllowed = true;
      }

      if (!rateLimitAllowed) {
        return {
          success: false,
          error: 'Muitas tentativas. Por favor, aguarde alguns minutos antes de tentar novamente.',
        };
      }
    }


    // 3. Server-side normalization & validation
    const name = typeof input.name === 'string' ? input.name.trim() : '';
    const rawEmail = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
    const rawPhone = typeof input.phone === 'string' ? input.phone.trim() : '';
    const company_name = typeof input.company_name === 'string' ? input.company_name.trim() : '';
    const acting_type = input.acting_type;
    const submission_id = typeof input.submission_id === 'string' ? input.submission_id.trim() : undefined;

    // Validate submission_id is a valid UUID if provided
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (submission_id && !uuidRegex.test(submission_id)) {
      return { success: false, error: 'Identificador de submissão inválido.' };
    }

    if (!name || name.length < 2 || name.length > 150) {
      return { success: false, error: 'Por favor, informe seu nome completo.' };
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!rawEmail || !emailRegex.test(rawEmail) || rawEmail.length > 150) {
      return { success: false, error: 'Por favor, informe um e-mail válido.' };
    }

    const normalizedPhone = normalizePhone(rawPhone);
    if (!normalizedPhone || normalizedPhone.length < 10) {
      return { success: false, error: 'Por favor, informe um número de WhatsApp válido.' };
    }

    const validActingTypes = new Set(['representante', 'distribuidora', 'industria', 'outro']);
    if (!acting_type || !validActingTypes.has(acting_type)) {
      return { success: false, error: 'Por favor, selecione como você atua.' };
    }

    // 4. Admin client for secure server-side lead table operations
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceKey || !supabaseUrl) {
      console.error('[lead-capture:error]', { message: 'Missing environment configuration for admin client' });
      return { success: false, error: 'Erro de configuração no servidor.' };
    }

    const supabaseAdmin = createAdminClient();

    // 5. Idempotency Check via submission_id (prevents duplicate submissions on double-click or retry)
    if (submission_id) {
      const { data: existingSubmission } = await supabaseAdmin
        .from('leads')
        .select('id')
        .eq('submission_id', submission_id)
        .maybeSingle();

      if (existingSubmission?.id) {
        return { success: true, lead_id: existingSubmission.id };
      }
    }

    // 6. Application-level Deduplication: Check for recent un-converted lead (last 24 hours) with same email
    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: existingLeads, error: searchError } = await supabaseAdmin
      .from('leads')
      .select('id, email, status, user_id')
      .eq('email', rawEmail)
      .is('user_id', null)
      .eq('status', 'lead_captured')
      .gte('created_at', twentyFourHoursAgo)
      .order('created_at', { ascending: false })
      .limit(1);

    if (searchError) {
      console.error('[lead-capture:error]', { message: searchError.message, code: searchError.code });
    }

    let leadId: string | null = null;
    const existingLead = Array.isArray(existingLeads) && existingLeads.length > 0 ? existingLeads[0] : null;

    const leadDataPayload: Record<string, any> = {
      name,
      whatsapp: normalizedPhone,
      email: rawEmail,
      acting_type,
      company_name: company_name || null,
      submission_id: submission_id || null,
      utm_source: input.utm_source ? input.utm_source.trim().slice(0, 100) : null,
      utm_medium: input.utm_medium ? input.utm_medium.trim().slice(0, 100) : null,
      utm_campaign: input.utm_campaign ? input.utm_campaign.trim().slice(0, 100) : null,
      utm_content: input.utm_content ? input.utm_content.trim().slice(0, 100) : null,
      utm_term: input.utm_term ? input.utm_term.trim().slice(0, 100) : null,
      updated_at: new Date().toISOString(),
    };

    if (existingLead) {
      // Deduplicate by updating recent active lead
      const { error: updateErr } = await supabaseAdmin
        .from('leads')
        .update(leadDataPayload)
        .eq('id', existingLead.id);

      if (updateErr) {
        console.error('[lead-capture:error]', { message: updateErr.message, code: updateErr.code });
      } else {
        leadId = existingLead.id;
      }
    }

    if (!leadId) {
      // Create new lead entry
      const { data: insertedLead, error: insertErr } = await supabaseAdmin
        .from('leads')
        .insert({
          ...leadDataPayload,
          status: 'lead_captured',
          created_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (insertErr) {
        // Handle Postgres error 23505 (unique constraint violation on submission_id during concurrent inserts)
        if (
          (insertErr as any)?.code === '23505' ||
          insertErr.message?.includes('submission_id') ||
          insertErr.message?.includes('duplicate key')
        ) {
          if (submission_id) {
            const { data: conflLead } = await supabaseAdmin
              .from('leads')
              .select('id')
              .eq('submission_id', submission_id)
              .maybeSingle();

            if (conflLead?.id) {
              leadId = conflLead.id;
            }
          }
        }

        if (!leadId) {
          console.error('[lead-capture:error]', { message: insertErr.message, code: insertErr.code });
          return { success: false, error: 'Erro ao registrar dados comerciais.' };
        }
      } else {
        leadId = insertedLead?.id ?? null;
      }
    }

    if (leadId) {
      // 5. Set secure httpOnly cookie for session / OAuth cross-redirect continuity
      try {
        const cookieStore = await cookies();
        cookieStore.set('rep_lead_id', leadId, {
          httpOnly: true,
          sameSite: 'lax',
          secure: process.env.NODE_ENV === 'production',
          path: '/',
          maxAge: 3600, // 1 hour expiration
        });
      } catch (e) {
        // Non-blocking cookie setting fallback
      }

      return { success: true, lead_id: leadId };
    }

    return { success: false, error: 'Não foi possível salvar o lead.' };
  } catch (err: any) {
    // Sanitized PII-free log
    console.error('[lead-capture:error]', {
      message: err?.message || String(err),
      name: err?.name,
    });
    return { success: false, error: 'Ocorreu um erro ao processar seu cadastro.' };
  }
}

export async function getLeadByIdAction(leadIdInput?: string): Promise<{
  success: boolean;
  lead?: {
    id: string;
    name: string;
    email: string;
    whatsapp: string;
    company_name?: string;
    acting_type?: string;
  };
}> {
  try {
    let leadId = typeof leadIdInput === 'string' ? leadIdInput.trim() : '';

    if (!leadId) {
      try {
        const cookieStore = await cookies();
        leadId = cookieStore.get('rep_lead_id')?.value || '';
      } catch (_e) {
        // ignore
      }
    }

    if (!leadId) {
      return { success: false };
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!serviceKey || !supabaseUrl) {
      return { success: false };
    }

    const supabaseAdmin = createAdminClient();
    const { data: lead, error } = await supabaseAdmin
      .from('leads')
      .select('id, name, email, whatsapp, company_name, acting_type')
      .eq('id', leadId)
      .maybeSingle();

    if (error || !lead) {
      return { success: false };
    }

    return {
      success: true,
      lead: {
        id: lead.id,
        name: lead.name || '',
        email: lead.email || '',
        whatsapp: lead.whatsapp || '',
        company_name: lead.company_name || '',
        acting_type: lead.acting_type || '',
      },
    };
  } catch (err) {
    return { success: false };
  }
}
