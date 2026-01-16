import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function getActiveUserId() {
  const supabase = await createClient();
  const cookieStore = await cookies();

  const {
    data: { user },
  } = await supabase.auth.getUser();

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
