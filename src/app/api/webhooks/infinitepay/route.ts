import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Inicializa o Supabase com a Service Role (para contornar RLS e atualizar o status)
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // 1. LER O BODY DA REQUISIÇÃO
    const body = await request.json();
    
    // Log para você monitorar no Vercel/Terminal o que a InfinitePay está enviando
    console.log('[Webhook InfinitePay] Recebido:', body);

    // 2. EXTRAIR DADOS (conforme a documentação de links que você viu)
    const supabaseUserId = body.order_nsu; 
    const statusPagamento = body.status; // 'approved', 'pending', etc.

    // 3. VALIDAR E ATUALIZAR
    if (statusPagamento === 'approved' && supabaseUserId) {
      const { error } = await supabaseAdmin
        .from('profiles')
        .update({ 
            status: 'active',
            updated_at: new Date().toISOString() 
        })
        .eq('id', supabaseUserId);

      if (error) {
        console.error('[Webhook Error] Falha ao atualizar perfil:', error);
        return NextResponse.json({ error: 'Erro ao atualizar banco' }, { status: 500 });
      }

      console.log(`[Webhook Success] Usuário ${supabaseUserId} ativado com sucesso.`);
    }

    // 4. RETORNAR SEMPRE OK PARA A INFINITEPAY
    return NextResponse.json({ ok: true });
    
  } catch (err: any) {
    console.error('[Webhook Error] Falha no processamento:', err.message);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}