import { NextResponse } from 'next/server';

// Rota simples para ser chamada por um Cron/Vercel Scheduler ou Inngest.
// Ela dispara a rota interna de processamento de imagens em lotes.
export async function POST() {
  try {
    // Chama a rota interna que processa 25 itens por vez
    const base = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : `http://localhost:3000`;

    const res = await fetch(`${base}/api/admin/sync-images`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await res.json();
    return NextResponse.json({ ok: true, triggered: true, data });
  } catch (err: any) {
    return NextResponse.json(
      { ok: false, error: err.message },
      { status: 500 }
    );
  }
}
