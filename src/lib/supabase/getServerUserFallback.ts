import { cookies } from 'next/headers';
import { createClient } from './server';

export async function getServerUserFallback() {
  try {
    // 1. Tenta autenticação nativa do Supabase SSR com os cookies da sessão
    const supabase = await createClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (user && !error) {
      return user;
    }

    // 2. Fallback manual procurando por tokens de acesso alternativos nos cookies
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !anon) return null;

    const cookieStore = await cookies();
    const allCookies = cookieStore.getAll();

    // Procura por qualquer cookie que contenha token de sessão do Supabase ou repvendas
    const tokenCookie = allCookies.find(
      (c) =>
        c.name.includes('access-token') ||
        c.name.includes('auth-token') ||
        c.name.includes('sb-')
    );

    if (!tokenCookie?.value) return null;

    let accessToken = tokenCookie.value;
    try {
      if (accessToken.startsWith('[')) {
        const parsed = JSON.parse(accessToken);
        if (Array.isArray(parsed) && parsed[0]) accessToken = parsed[0];
      }
    } catch (_) {}

    const authUrl = String(url).replace(/\/$/, '') + '/auth/v1/user';

    const res = await fetch(authUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: String(anon),
        Accept: 'application/json',
      },
    });

    if (!res.ok) return null;
    const json = await res.json();
    return json ?? null;
  } catch (e) {
    console.warn('[getServerUserFallback] failed to validate token', e);
    return null;
  }
}
