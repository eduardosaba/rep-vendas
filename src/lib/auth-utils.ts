import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

function isValidUuid(value: string | undefined | null) {
  if (!value) return false;

  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function getActiveUserId() {
  const supabase = await createClient();
  const cookieStore = await cookies();

  let user: any = null;

  try {
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !authUser) {
      return null;
    }

    user = authUser;
  } catch (err: any) {
    console.warn(
      'getActiveUserId: supabase.auth.getUser() failed',
      err?.message || err
    );

    return null;
  }

  const impersonateCookieName =
    process.env.IMPERSONATE_COOKIE_NAME || 'impersonate_user_id';

  const impersonateId = cookieStore.get(impersonateCookieName)?.value;

  if (!impersonateId || !isValidUuid(impersonateId)) {
    return user.id;
  }

  try {
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (error || !profile) {
      return user.id;
    }

    const role = profile?.role || null;

    const allowedRoles = [
      'master',
      'admin',
      'owner',
      'template',
      'admin_company',
    ];

    if (role && allowedRoles.includes(role)) {
      return impersonateId;
    }

    return user.id;
  } catch (err: any) {
    console.warn(
      'getActiveUserId: profile role check failed',
      err?.message || err
    );

    return user.id;
  }
}
