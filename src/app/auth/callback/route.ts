import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function GET(request: Request) {
  try {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    const next = searchParams.get('next') ?? '/dashboard';

    if (!code)
      return NextResponse.redirect(`${origin}/login?error=auth-code-error`);

    const supabase = await createClient();

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (error || !data?.user)
      return NextResponse.redirect(`${origin}/login?error=auth-code-error`);

    // If user requested password reset flow, just redirect to the password page
    if (next.includes('/settings/password'))
      return NextResponse.redirect(`${origin}${next}`);

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .maybeSingle();
    const finalRedirect = profile?.role === 'master' ? '/admin' : next;
    return NextResponse.redirect(`${origin}${finalRedirect}`);
  } catch (err) {
    return NextResponse.redirect('/login?error=auth-code-error');
  }
}
