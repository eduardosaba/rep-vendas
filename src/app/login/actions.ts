'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { isGlobalAdmin } from '@/lib/auth/roles';

function extractMissingColumn(msg: unknown) {
  const s = String((msg as any)?.message || msg || '');
  const m = s.match(/column\s+"?([\w_]+)"?\s+does not exist/i);
  return m ? m[1] : null;
}

export async function login(_arg: unknown, formData: FormData) {
  const email = formData.get('email') as string;
  const password = formData.get('password') as string;

  try {
    const supabase = await createClient();
    
    // 1. Faz a autenticação normal para validar as credenciais do usuário
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: 'E-mail ou senha incorretos.' };

    // 2. DERRUBADA DE SESSÃO CONCORRENTE: Invalida e desloga imediatamente todas 
    // as outras instâncias/dispositivos (ex: outro celular Android ou computador)
    // mantendo viva estritamente a conexão deste dispositivo atual.
    try {
      await supabase.auth.signOut({ scope: 'others' });
    } catch (signOutErr) {
      console.warn('Aviso: Não foi possível invalidar sessões concorrentes:', signOutErr);
    }

    // 3. Captura o profile do usuário para prosseguir com o roteamento correto
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
    try { revalidatePath('/', 'layout'); } catch (_) {}

    const userRole = String(profile?.role || '').toLowerCase();
    const isControlTowerUser = isGlobalAdmin(userRole);

    return { success: true, redirectTo: isControlTowerUser ? '/admin' : '/dashboard' };
  } catch (err: unknown) {
    console.error('Erro na Server Action login:', err);
    return { error: 'Erro interno no servidor.' };
  }
}

export async function loginWithGoogle() {
  try {
    const supabase = await createClient();
    const redirectTo = process.env.NEXT_PUBLIC_APP_URL ? process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, '') : undefined;
    const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
    if (error) return { error: error?.message };
    return { url: (data as any)?.url };
  } catch (err: unknown) {
    console.error('Erro loginWithGoogle:', err);
    return { error: 'Erro ao iniciar login com Google' };
  }
}

export async function signup(formData: FormData) {
  try {
    const supabase = await createClient();
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const fullName = (formData.get('fullName') as string) || (formData.get('name') as string) || '';
    const rawPhone = (formData.get('phone') as string) || '';

    const { normalizePhone } = await import('@/lib/phone');
    const normalizedPhone = normalizePhone(rawPhone);

    const { data: _data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName || null,
          phone: normalizedPhone || null,
        },
      },
    });
    if (error) return { error: (error as { message?: string })?.message || 'Erro' };

    const userId = (_data as any)?.user?.id;
    if (userId && process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const supabaseAdmin = createSupabaseAdmin(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );

      const missingCols = new Set<string>();

      try {
        const { normalizePhone } = await import('@/lib/phone');
        const normalizedPhone = normalizePhone(rawPhone);
        const estados = formData.getAll('estados') as string[] | [];

        const profilePayload: Record<string, any> = {
          id: userId,
          email,
          full_name: fullName || null,
          phone: normalizedPhone || null,
          updated_at: new Date().toISOString(),
        };
        if (estados && estados.length > 0) profilePayload.estados = estados;

        const { error: profileErr } = await supabaseAdmin.from('profiles').upsert(profilePayload, { onConflict: 'id' });
        if (profileErr) {
          const c = extractMissingColumn(profileErr);
          if (c) missingCols.add(c);
          console.error('signup: failed to upsert profiles', profileErr);
        }

        // --- SECURE LEAD LINKAGE LOGIC ---
        try {
          const { cookies } = await import('next/headers');
          const cookieStore = await cookies();
          const cookieLeadId = cookieStore.get('rep_lead_id')?.value || null;
          const formLeadId = (formData.get('lead_id') as string) || null;
          const targetLeadId = formLeadId || cookieLeadId;

          const normalizedAuthEmail = email.trim().toLowerCase();
          let matchedLead: any = null;

          if (targetLeadId) {
            const { data: leadData } = await supabaseAdmin
              .from('leads')
              .select('*')
              .eq('id', targetLeadId)
              .maybeSingle();

            // Strict security check: lead email MUST match auth email, and user_id MUST be null or already match current user
            if (
              leadData &&
              leadData.email.trim().toLowerCase() === normalizedAuthEmail &&
              (leadData.user_id === null || leadData.user_id === userId)
            ) {
              matchedLead = leadData;
            }
          }

          // Fallback linkage by normalized email if targetLeadId mismatch or absent
          if (!matchedLead) {
            const { data: fallbackLeads } = await supabaseAdmin
              .from('leads')
              .select('*')
              .eq('email', normalizedAuthEmail)
              .is('user_id', null)
              .order('created_at', { ascending: false })
              .limit(1);

            if (Array.isArray(fallbackLeads) && fallbackLeads.length > 0) {
              matchedLead = fallbackLeads[0];
            }
          }

          if (matchedLead) {
            await supabaseAdmin
              .from('leads')
              .update({
                user_id: userId,
                status: 'account_created',
                updated_at: new Date().toISOString(),
              })
              .eq('id', matchedLead.id);

            // Populate company_name into settings.name if present
            if (matchedLead.company_name) {
              await supabaseAdmin.from('settings').upsert(
                {
                  user_id: userId,
                  name: matchedLead.company_name,
                  updated_at: new Date().toISOString(),
                },
                { onConflict: 'user_id' }
              );
            }

            // Clear rep_lead_id cookie after successful linkage
            try {
              cookieStore.delete('rep_lead_id');
            } catch (e) {
              // ignore
            }
          }
        } catch (leadErr) {
          console.error('[signup:lead-linkage:error]', { message: (leadErr as any)?.message });
        }
      } catch (err) { console.warn('Não foi possível gravar perfil no signup:', err); }

      try {
        const { data: plans, error: plansErr } = await supabaseAdmin.from('plans').select('id, name, price').order('price', { ascending: true }).limit(1);
        if (plansErr) {
          const c = extractMissingColumn(plansErr);
          if (c) missingCols.add(c);
          console.error('signup: failed to fetch plans', plansErr);
        }
        const plan = Array.isArray(plans) && plans.length > 0 ? plans[0] : null;
        const planId = plan?.id || null;
        const planName = plan?.name || 'Trial';

        try {
          const endsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
          const { error: subErr } = await supabaseAdmin.from('subscriptions').upsert({ user_id: userId, plan_id: planId, status: 'trial', plan_name: planName, current_period_end: endsAt, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
          if (subErr) {
            const c = extractMissingColumn(subErr);
            if (c) missingCols.add(c);
            console.error('signup: failed to upsert subscription', subErr);
          }
        } catch (err) { console.warn('signup: error upserting subscription', err); }

        try {
          const { error: settingsErr } = await supabaseAdmin.from('settings').upsert({ user_id: userId, plan_type: planName, updated_at: new Date().toISOString() });
          if (settingsErr) {
            const c = extractMissingColumn(settingsErr);
            if (c) missingCols.add(c);
            console.error('signup: failed to upsert settings', settingsErr);
          }
        } catch (err) { console.warn('signup: error upserting settings', err); }

        if (missingCols.size > 0) {
          console.warn('signup: detected missing columns in DB schema', Array.from(missingCols));
          return { success: true, redirectTo: '/onboarding', missingColumns: Array.from(missingCols) } as any;
        }
      } catch (err) { console.warn('Não foi possível completar rotinas pós-signup (trial/profiles):', err); }
    }

    return { success: true, redirectTo: '/onboarding' };
  } catch (err: unknown) {
    console.error('Erro signup:', err);
    return { error: 'Erro ao cadastrar usuário' };
  }
}

export async function logout() {
  try {
    const supabase = await createClient();
    const { error } = await supabase.auth.signOut();
    if (error) return { error: error.message || String(error) };
    try { revalidatePath('/', 'layout'); } catch (_) {}
    return { success: true, redirectTo: '/login' };
  } catch (err) {
    console.error('Erro logout:', err);
    return { error: 'Erro ao sair' };
  }
}