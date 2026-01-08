import { cookies } from 'next/headers';

export async function getServerUserFallback() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;

    const cookieStore = await cookies();
    const accessCookie =
      cookieStore.get('__Secure-sb-access-token') ||
      cookieStore.get('sb-access-token');
    const access = accessCookie?.value;
    if (!access) return null;

    const authUrl = String(url).replace(/\/$/, '') + '/auth/v1/user';

    const res = await fetch(authUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${access}`,
        apikey: String(anon),
        Accept: 'application/json',
      },
    });

    if (!res.ok) return null;
    const json = await res.json();
    // Supabase /auth/v1/user returns the user object directly
    return json ?? null;
  } catch (e) {
    console.warn('[getServerUserFallback] failed to validate token', e);
    return null;
  }
}
