import { NextResponse } from 'next/server';

export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? null;

  const result: {
    url: string | null;
    ok: boolean | null;
    status: number | null;
    statusText: string | null;
    error: string | null;
    timestamp: string;
  } = {
    url,
    ok: null,
    status: null,
    statusText: null,
    error: null,
    timestamp: new Date().toISOString(),
  };

  if (!url) {
    result.error = 'NEXT_PUBLIC_SUPABASE_URL not defined';
    console.warn('[supabase-check] env missing');
    return NextResponse.json(result, { status: 500 });
  }

  try {
    // Faz um fetch simples para validar conectividade do servidor ao Supabase
    const res = await fetch(url, { method: 'GET' });
    result.ok = res.ok;
    result.status = res.status;
    result.statusText = res.statusText;
    console.log('[supabase-check] fetch', { url, status: res.status });
  } catch (e: any) {
    result.error = e?.message ?? String(e);
    console.error('[supabase-check] fetch failed', result.error);
  }

  return NextResponse.json(result);
}
