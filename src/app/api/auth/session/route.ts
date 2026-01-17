import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(req: Request) {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('auth/session getSession warning', error.message);
    }
    const session = data?.session || null;
    const access_token = session?.access_token || null;
    return NextResponse.json({ access_token, session });
  } catch (err: any) {
    console.error('auth/session error', err);
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
