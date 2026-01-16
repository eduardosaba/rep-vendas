import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';

export async function getActiveUserId() {
  const supabase = await createClient();
  const cookieStore = await cookies();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const impersonateId = cookieStore.get('impersonate_user_id')?.value;

  // Só permite impersonation para perfis com role 'master' ou 'admin'
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role || null;

  if (impersonateId && (role === 'master' || role === 'admin')) {
    return impersonateId;
  }

  return user.id;
}
