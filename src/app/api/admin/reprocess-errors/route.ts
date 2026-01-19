import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST() {
  const supabase = await createClient();

  // 1. Identifica e reseta apenas os produtos que falharam
  const { count, error } = await supabase
    .from('products')
    .update({
      sync_status: 'pending',
      sync_error: 'Reprocessamento manual solicitado',
    })
    .eq('sync_status', 'failed');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    message: `Sucesso! ${count} produtos voltaram para a fila.`,
    count,
  });
}
