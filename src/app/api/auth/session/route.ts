import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';

function extractJwtFromCookieValue(raw: string | undefined | null): string | null {
  if (!raw) return null;
  let value = raw;
  try {
    value = decodeURIComponent(raw);
  } catch {
    // ignore
  }

  try {
    const parsed = JSON.parse(value);
    if (typeof parsed === 'string' && parsed.split('.').length === 3) {
      return parsed;
    }
    if (Array.isArray(parsed)) {
      const token = parsed.find(
        (item) => typeof item === 'string' && item.split('.').length === 3
      );
      if (token) return token as string;
    }
    if (parsed && typeof parsed === 'object') {
      const fromObject =
        (parsed as any).access_token ||
        (parsed as any).currentSession?.access_token ||
        null;
      if (typeof fromObject === 'string' && fromObject.split('.').length === 3) {
        return fromObject;
      }
    }
  } catch {
    // fallback regex below
  }

  const match = value.match(/[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/);
  return match ? match[0] : null;
}

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (error) {
      console.warn('auth/session getUser warning', error.message);
    }

    const cookieStore = await cookies();
    const authCookie = cookieStore
      .getAll()
      .find((c) => c.name.includes('-auth-token'));
    const access_token = extractJwtFromCookieValue(authCookie?.value || null);

    return NextResponse.json({ access_token, user: data?.user || null });
  } catch (err: any) {
    console.error('auth/session error', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
