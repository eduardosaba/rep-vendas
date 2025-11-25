import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabaseServer';
import { cookies } from 'next/headers';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'missing userId query param' },
        { status: 400 }
      );
    }

    const nextCookies = await cookies();
    const supabase = createRouteSupabase(() => nextCookies);

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .single();

    // Retornar tanto data quanto error (PostgREST fornece mais detalhes no error)
    return NextResponse.json({ data, error }, { status: error ? 500 : 200 });
  } catch (err: any) {
    console.error('debug/profile exception', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
