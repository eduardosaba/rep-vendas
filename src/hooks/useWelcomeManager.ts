import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export const APP_WELCOME_VERSION =
  process.env.NEXT_PUBLIC_WELCOME_VERSION ||
  process.env.NEXT_PUBLIC_APP_VERSION ||
  '1.0.0';

export function useWelcomeManager() {
  const [shouldShow, setShouldShow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const init = async () => {
      // Primeiro, checar localStorage (cliente) para evitar chamadas desnecessárias
      try {
        if (
          typeof window !== 'undefined' &&
          window.localStorage &&
          typeof window.localStorage.getItem === 'function'
        ) {
            const seen = window.localStorage.getItem(
              'repvendas_last_seen_version'
            );
          if (seen && String(seen) === String(APP_WELCOME_VERSION)) {
            if (mounted) {
              setLoading(false);
              setShouldShow(false);
            }
            return;
          }
        }
      } catch (e) {
        // ignore localStorage errors and continue with server check
      }
      try {
        const supabase = createClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!mounted) return;
        if (!user) {
          setLoading(false);
          return;
        }
        setProfileId(user.id);

        const { data } = await supabase
          .from('profiles')
          .select('last_welcome_version')
          .eq('id', user.id)
          .maybeSingle();

        const last = data?.last_welcome_version || '0.0.0';
        if (last !== APP_WELCOME_VERSION) setShouldShow(true);
      } catch (err) {
        console.error('useWelcomeManager error', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    init();
    return () => {
      mounted = false;
    };
  }, []);

  const markAsSeen = async () => {
    if (!profileId) return false;
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from('profiles')
        .update({ last_welcome_version: APP_WELCOME_VERSION })
        .eq('id', profileId);
      if (error) throw error;
      // Persistir também no localStorage para compatibilizar com o
      // componente client-side `UpdateModalClient` que usa o mesmo
      // mecanismo local para não mostrar novamente a mesma versão.
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(
            'repvendas_last_seen_version',
            String(APP_WELCOME_VERSION)
          );
        }
      } catch (e) {
        // ignore localStorage errors
      }

      setShouldShow(false);
      return true;
    } catch (err) {
      console.error('markAsSeen error', err);
      return false;
    }
  };

  return { shouldShow, loading, markAsSeen, version: APP_WELCOME_VERSION };
}
