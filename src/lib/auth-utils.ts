import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function getActiveUserId() {
  const supabase = await createClient();
  const cookieStore = await cookies();
  let user: any = null;
  try {
    const res = await supabase.auth.getUser();
    user = res?.data?.user ?? null;
  } catch (err: any) {
    // Se o refresh token estiver inválido ou ausente, tratamos como não autenticado
    console.warn('getActiveUserId: supabase.auth.getUser() failed', err?.message || err);
    return null;
  }

  if (!user) return null;

  const impersonateCookieName =
    process.env.IMPERSONATE_COOKIE_NAME || 'impersonate_user_id';
  const impersonateId = cookieStore.get(impersonateCookieName)?.value;

  // Só permite impersonation para perfis autorizados
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role || null;
  const allowedRoles = ['master', 'admin', 'template', 'rep', 'representative'];

  if (impersonateId && role && allowedRoles.includes(role)) {
    return impersonateId;
  }

  return user.id;
}
