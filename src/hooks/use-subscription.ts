'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useSubscription() {
  const supabase = createClient();
  const [subscription, setSubscription] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    async function loadSubscription() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) setLoading(false);
          return;
        }

        const { data } = await supabase
          .from('subscriptions')
          .select('*, plans(*)')
          .eq('user_id', user.id)
          .maybeSingle();

        if (mounted) setSubscription(data || null);
      } catch (err) {
        console.error('useSubscription error', err);
      } finally {
        if (mounted) setLoading(false);
      }
    }
    loadSubscription();
    return () => {
      mounted = false;
    };
  }, [supabase]);

  const canUseFeature = (
    feature: 'can_customize_branding' | 'can_use_sync_procv'
  ) => {
    return !!(
      subscription &&
      subscription.plans &&
      subscription.plans[feature]
    );
  };

  return { subscription, loading, canUseFeature };
}
