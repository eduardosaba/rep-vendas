import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

export async function createAuditLog(
  action: string,
  description: string,
  metadata: any = {}
) {
  const supabase = await createClient();
  const cookieStore = await cookies();

  let realUser: any = null;
  try {
    const res: any = await supabase.auth.getUser();
    realUser = res?.data?.user ?? null;
  } catch (e: any) {
    console.warn('createAuditLog: supabase.auth.getUser() failed', e?.message || e);
    return;
  }
  if (!realUser) return;

  const impersonateCookieName =
    process.env.IMPERSONATE_COOKIE_NAME || 'impersonate_user_id';
  const impersonatedUserId = cookieStore.get(impersonateCookieName)?.value;

  const logData = {
    user_id: impersonatedUserId || realUser.id,
    impersonator_id: impersonatedUserId ? realUser.id : null,
    action_type: action,
    description,
    metadata: {
      ...metadata,
      is_impersonated: !!impersonatedUserId,
    },
  };

  try {
    await supabase.from('activity_logs').insert(logData);
  } catch (e) {
    // swallow errors to avoid breaking flows
    console.error('createAuditLog error', e);
  }
}
