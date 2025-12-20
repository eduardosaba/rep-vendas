'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { logger } from '@/lib/logger';
import { getErrorMessage } from '@/utils/getErrorMessage';

export async function addSubscriptionDays(
  targetUserId: string,
  days: number = 30
) {
  try {
    // 1. Configurar Cliente ADMIN (Bypass RLS)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    const supabaseAdmin = createClient(supabaseUrl, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 2. Buscar assinatura atual
    const { data: currentSub } = await supabaseAdmin
      .from('subscriptions')
      .select('current_period_end, status')
      .eq('user_id', targetUserId)
      .maybeSingle();

    // 3. Calcular a nova data
    const now = new Date();
    let newDate = new Date();

    if (currentSub && currentSub.current_period_end) {
      const currentEnd = new Date(currentSub.current_period_end);

      // Lógica Inteligente:
      // Se já venceu (está no passado), soma 30 dias a partir de HOJE.
      // Se ainda está ativo (futuro), soma 30 dias a partir do VENCIMENTO ATUAL (acumula).
      if (currentEnd > now) {
        newDate = new Date(currentEnd);
        newDate.setDate(newDate.getDate() + days);
      } else {
        newDate = new Date();
        newDate.setDate(newDate.getDate() + days);
      }
    } else {
      // Se nunca teve assinatura, começa de hoje + 30 dias
      newDate.setDate(newDate.getDate() + days);
    }

    // 4. Salvar no Banco
    const { error } = await supabaseAdmin.from('subscriptions').upsert(
      {
        user_id: targetUserId,
        status: 'active', // Força status ativo
        plan_name: 'Pro (Manual)',
        current_period_end: newDate.toISOString(),
      },
      { onConflict: 'user_id' }
    );

    if (error) throw new Error(error.message);

    // Atualiza a tela
    revalidatePath('/admin/users');

    return { success: true, newDate: newDate.toISOString() };
  } catch (error: unknown) {
    logger.error('Erro ao adicionar dias', error);
    return { success: false, error: getErrorMessage(error) };
  }
}
