'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type Permissions = {
  can_customize_branding: boolean;
  can_use_ai_features: boolean;
};

export function usePlan() {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [planType, setPlanType] = useState<string | null>(null);
  const [permissions, setPermissions] = useState<Permissions | null>(null);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        setLoading(true);
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        // Se for usuário master, conceder todas permissões (override)
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .maybeSingle();
          if (profile?.role === 'master') {
            if (mounted) {
              setPlanType('master');
              setPermissions({
                can_customize_branding: true,
                can_use_ai_features: true,
              });
            }
            if (mounted) setLoading(false);
            return;
          }
        } catch (e) {
          // se falhar, continua com o fluxo normal
          console.warn('usePlan: erro ao verificar role do perfil', e);
        }

        // Primeiro tentamos obter a assinatura ativa (subscriptions JOIN plans)
        const { data: subs } = await supabase
          .from('subscriptions')
          .select('*, plans(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(1);

        if (mounted && subs && subs.length > 0) {
          const sub = subs[0] as any;
          const plan = sub.plans || sub.plan || null;
          const pType = plan?.key || plan?.type || null;
          setPlanType(pType);
          setPermissions({
            can_customize_branding: !!(
              plan &&
              (plan.key === 'pro' || plan.key === 'premium')
            ),
            can_use_ai_features: !!(plan && plan.key === 'premium'),
          });
          return;
        }

        // Fallback: ler diretamente a tabela settings.plan_type
        const { data: settings } = await supabase
          .from('settings')
          .select('plan_type')
          .eq('user_id', user.id)
          .maybeSingle();

        const pType = settings?.plan_type || null;
        if (mounted) {
          setPlanType(pType);
          setPermissions({
            can_customize_branding: pType === 'pro' || pType === 'premium',
            can_use_ai_features: pType === 'premium',
          });
        }
      } catch (err) {
        console.error('usePlan load error', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const checkPermission = (
    feature: 'custom_font' | 'bulk_sync' | 'advanced_analytics'
  ) => {
    if (!permissions) return false;
    const map: Record<string, boolean> = {
      custom_font: permissions.can_customize_branding,
      bulk_sync: true,
      advanced_analytics: permissions.can_use_ai_features,
    };
    return !!map[feature];
  };

  return { loading, planType, checkPermission };
}
