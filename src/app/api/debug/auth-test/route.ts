import { NextResponse } from 'next/server';

function maskToken(t: string | undefined) {
  if (!t) return null;
  if (t.length <= 12) return '***';
  return t.slice(0, 6) + '...' + t.slice(-4);
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = body?.email;
    const password = body?.password;

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'email and password required' },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !anonKey) {
      return NextResponse.json(
        { ok: false, error: 'Supabase env missing' },
        { status: 500 }
      );
    }

    const tokenUrl = `${supabaseUrl.replace(/\/$/, '')}/auth/v1/token?grant_type=password`;

    const res = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: anonKey,
      },
      body: JSON.stringify({ email, password }),
    });

    const json = await res.text();
    let parsed: any = null;
    try {
      parsed = JSON.parse(json);
      if (parsed.access_token)
        parsed.access_token = maskToken(parsed.access_token);
      if (parsed.refresh_token)
        parsed.refresh_token = maskToken(parsed.refresh_token);
    } catch (e) {
      // not json
    }

    return NextResponse.json(
      {
        ok: res.ok,
        status: res.status,
        statusText: res.statusText,
        body: parsed ?? json,
      },
      { status: 200 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}
