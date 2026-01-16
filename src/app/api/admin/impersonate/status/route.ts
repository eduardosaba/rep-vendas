import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const impersonateCookieName =
      process.env.IMPERSONATE_COOKIE_NAME || 'impersonate_user_id';
    const c = cookieStore.get(impersonateCookieName);
    return NextResponse.json({ impersonate_user_id: c?.value || null });
  } catch (err: any) {
    return NextResponse.json({ impersonate_user_id: null });
  }
}
