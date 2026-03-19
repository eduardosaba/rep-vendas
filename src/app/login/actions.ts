'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

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
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: 'E-mail ou senha incorretos.' };

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', data.user.id).single();
    try { revalidatePath('/', 'layout'); } catch (_) {}

    return { success: true, redirectTo: profile?.role === 'master' ? '/admin' : '/dashboard' };
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

    const { data: _data, error } = await supabase.auth.signUp({ email, password });
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
        const estados = formData.getAll('estados') as string[] | [];
        if (estados && estados.length > 0) {
          const { error: profileErr } = await supabaseAdmin.from('profiles').upsert({ id: userId, estados, updated_at: new Date().toISOString() }, { onConflict: 'id' });
          if (profileErr) {
            const c = extractMissingColumn(profileErr);
            if (c) missingCols.add(c);
            console.error('signup: failed to upsert profiles', profileErr);
          }
        }
      } catch (err) { console.warn('Não foi possível gravar campo opcional estados no profile:', err); }

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
          return { success: true, redirectTo: '/dashboard', missingColumns: Array.from(missingCols) } as any;
        }
      } catch (err) { console.warn('Não foi possível completar rotinas pós-signup (trial/profiles):', err); }
    }

    return { success: true, redirectTo: '/dashboard' };
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
