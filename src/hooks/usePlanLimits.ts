import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

export function usePlanLimits() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(false);
  const [usage, setUsage] = useState({ current: 0, max: 0, planName: 'Free' });

  const checkLimit = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Pega a assinatura e o plano associado
      // (Supondo que você vincule pelo nome ou ID. Aqui uso nome por simplicidade atual)
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan_name')
        .eq('user_id', user.id)
        .single();

      const planName = sub?.plan_name || 'Free'; // Padrão se não tiver assinatura

      // 2. Busca o limite na tabela de Planos (que você configurou no Admin)
      const { data: plan } = await supabase
        .from('plans')
        .select('max_products')
        .eq('name', planName)
        .single();

      const maxLimit = plan?.max_products || 500; // Fallback se não achar plano

      // 3. Conta produtos atuais
      const { count } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const currentCount = count || 0;

      setUsage({
        current: currentCount,
        max: maxLimit,
        planName: planName,
      });

      setCanCreate(currentCount < maxLimit);
    } catch (error) {
      console.error(error);
      // Em caso de erro, bloqueia por segurança ou libera (sua escolha)
      setCanCreate(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkLimit();
  }, []);

  return { loading, canCreate, usage, refetch: checkLimit };
}
