import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isAdminRole } from '@/lib/auth/roles';

export function usePlanLimits() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [canCreate, setCanCreate] = useState(true);
  const [usage, setUsage] = useState({ current: 0, max: 10000, planName: 'Padrão' });

  const checkLimit = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setUsage({ current: 0, max: 10000, planName: 'Padrão' });
        setCanCreate(true);
        return;
      }

      // 1. Pega perfil do usuário para verificar role (administradores têm limite ilimitado)
      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .maybeSingle();

      const userRole = profile?.role;
      if (isAdminRole(userRole)) {
        setUsage({ current: 0, max: 999999, planName: 'Administrador' });
        setCanCreate(true);
        return;
      }

      // 2. Busca assinatura
      const { data: sub } = await supabase
        .from('subscriptions')
        .select('plan_name, plan_id')
        .eq('user_id', user.id)
        .maybeSingle();

      const planName = sub?.plan_name || 'Starter';

      // 3. Busca limite do plano
      let maxLimit = 10000;
      if (sub?.plan_id) {
        const { data: planById } = await supabase
          .from('plans')
          .select('product_limit, max_products')
          .eq('id', sub.plan_id)
          .maybeSingle();

        if (planById) {
          maxLimit = Number(planById.product_limit || planById.max_products) || 10000;
        }
      } else {
        const { data: planByName } = await supabase
          .from('plans')
          .select('product_limit, max_products')
          .eq('name', planName)
          .maybeSingle();

        if (planByName) {
          maxLimit = Number(planByName.product_limit || planByName.max_products) || 10000;
        }
      }

      if (maxLimit <= 0) {
        maxLimit = 10000;
      }

      // 4. Conta produtos atuais
      const { count } = await supabase
        .from('products')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const currentCount = count || 0;

      setUsage({
        current: currentCount,
        max: maxLimit,
        planName: planName,
      });

      setCanCreate(currentCount < maxLimit);
    } catch (error) {
      console.error('[usePlanLimits] Erro ao checar limite:', error);
      setUsage({ current: 0, max: 10000, planName: 'Padrão' });
      setCanCreate(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkLimit();
  }, []);

  return { loading, canCreate, usage, refetch: checkLimit };
}
