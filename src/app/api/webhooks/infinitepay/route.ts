import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('[Webhook InfinitePay] Body recebido:', JSON.stringify(body, null, 2));

    // 1. Extrair ID do usuário e o status do pagamento
    const supabaseUserId = body.order_nsu; 
    const paymentStatus = body.status; // 'approved', 'pending', 'canceled', etc.

    if (!supabaseUserId) {
      return NextResponse.json({ success: false, message: "order_nsu não fornecido" }, { status: 400 });
    }

    // 2. SÓ REALIZA A ATIVAÇÃO SE O PAGAMENTO FOR APROVADO
    // Isso evita que avisos de "pendente" ativem a conta antes da hora
    if (paymentStatus !== 'approved') {
      console.log(`[Webhook] Pagamento para ${supabaseUserId} ainda está como: ${paymentStatus}`);
      return NextResponse.json({ success: true, message: "Aguardando aprovação" }, { status: 200 });
    }

    // 3. Buscar Perfil
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('id, plan_id')
      .eq('id', supabaseUserId)
      .maybeSingle();

    if (profileError || !profile) {
      return NextResponse.json({ success: false, message: "Usuário não encontrado" }, { status: 400 });
    }

    // 4. Calcular 30 dias de validade
    const current_period_end = new Date();
    current_period_end.setDate(current_period_end.getDate() + 30);

    // 5. Atualizar Subscriptions (Importante: Se falhar aqui, retornamos 400 para a InfinitePay tentar de novo)
    const { error: subError } = await supabaseAdmin
      .from('subscriptions')
      .upsert({
        user_id: supabaseUserId,
        plan_id: profile.plan_id || 'pro',
        status: 'active',
        current_period_end: current_period_end.toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'user_id' });

    if (subError) {
      console.error('[Webhook Error] Falha em subscriptions:', subError);
      return NextResponse.json({ success: false, message: "Erro ao atualizar assinatura" }, { status: 400 });
    }

    // 6. Atualizar Status no Profile para 'active'
    const { error: profileUpdateError } = await supabaseAdmin
      .from('profiles')
      .update({ 
        status: 'active',
        updated_at: new Date().toISOString() 
      })
      .eq('id', supabaseUserId);

    if (profileUpdateError) {
      return NextResponse.json({ success: false, message: "Erro ao ativar perfil" }, { status: 400 });
    }

    console.log(`[Webhook Success] Usuário ${supabaseUserId} ativado por 30 dias.`);

    return NextResponse.json({ success: true, message: null }, { status: 200 });
    
  } catch (err: any) {
    console.error('[Webhook Error] Crítico:', err.message);
    return NextResponse.json({ success: false, message: "Internal Server Error" }, { status: 400 });
  }
}