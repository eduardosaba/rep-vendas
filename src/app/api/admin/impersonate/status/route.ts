import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function GET() {
  try {
    const cookieStore = await cookies();
    const c = cookieStore.get('impersonate_user_id');
    return NextResponse.json({ impersonate_user_id: c?.value || null });
  } catch (err: any) {
    return NextResponse.json({ impersonate_user_id: null });
  }
}
