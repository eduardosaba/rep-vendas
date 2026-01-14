import { inngest } from '@/inngest/client';
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();

  // 1. Verifica quem é o usuário logado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
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
  //    passa o jobId para que os workers possam reportar progresso.
  await inngest.send({
    name: 'catalog/sync.requested',
    data: {
      userId: user.id,
      jobId,
    },
  });

  return NextResponse.json({
    success: true,
    message: 'Sincronização iniciada!',
    jobId,
  });
}
