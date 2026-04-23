import { NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: Request) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            // @ts-ignore
            return (req as any).cookies?.getAll?.().map((c: any) => ({ name: c.name, value: c.value })) || [];
          },
          setAll() {
            // noop
          },
        },
      }
    );

    const { data: userData } = await supabase.auth.getUser();
    const user = userData?.user || null;
    if (!user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

    const { data: profile } = await supabase.from('profiles').select('status, trial_ends_at').eq('id', user.id).maybeSingle();

    return NextResponse.json({ ok: true, profile: profile || null });
  } catch (e) {
    console.error('profile/status error', e);
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 });
  }
}
