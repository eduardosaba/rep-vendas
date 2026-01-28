import { inngest } from '@/inngest/client';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const supabase = await createClient();

  // 1. Verifica quem é o usuário logado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  // lê filtros opcionais enviados pelo cliente
  let body: any = {};
  try {
    body = await req.json();
  } catch (e) {
    body = {};
  }

  // 2. Cria um registro inicial em `sync_jobs` para que a UI já consiga
  //    monitorar o progresso imediatamente, mesmo antes do Inngest processar.
  const { data: inserted, error: insertErr } = await supabase
    .from('sync_jobs')
    .insert({
      user_id: user.id,
      status: 'processing',
      total_count: 0,
      completed_count: 0,
      updated_at: new Date().toISOString(),
    })
    .select('id')
    .maybeSingle();

  const jobId = inserted?.id || null;

  // 3. Envia o evento para o Inngest iniciar o motor em segundo plano e
  //    passa o jobId e filtros para que os workers possam processar apenas
  //    o subconjunto desejado.
  try {
    await inngest.send({
      name: 'catalog/sync.requested',
      data: {
        userId: user.id,
        jobId,
        filters: body?.filters || null,
      },
    });
  } catch (err: any) {
    console.error('Inngest send error', err?.message || err);
    return NextResponse.json(
      {
        success: false,
        error: 'Falha ao disparar evento Inngest',
        details: String(err?.message || err),
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    success: true,
    message: 'Sincronização iniciada!',
    jobId,
  });
}
