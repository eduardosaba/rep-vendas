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

  // 2. Envia o evento para o Inngest iniciar o motor em segundo plano
  await inngest.send({
    name: 'catalog/sync.requested',
    data: {
      userId: user.id,
    },
  });

  return NextResponse.json({
    success: true,
    message: 'Sincronização iniciada!',
  });
}
