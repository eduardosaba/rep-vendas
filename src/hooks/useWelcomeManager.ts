import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  LAST_SEEN_UPDATE_ID_KEY,
  LAST_SEEN_VERSION_KEY,
} from '@/config/updates-config';

export function useWelcomeManager() {
  const [shouldShow, setShouldShow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updateData, setUpdateData] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkUpdate = async () => {
      try {
        const supabase = createClient();
        const { data: lastUpdate, error } = await supabase
          .from('system_updates')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (error || !lastUpdate) {
          if (mounted) setLoading(false);
          return;
        }

        if (!mounted) return;

        setUpdateData(lastUpdate);

        // Verificar localStorage por versão e id
        let lastSeenId: string | null = null;
        let lastSeenVersion: string | null = null;
        try {
          if (typeof window !== 'undefined' && window.localStorage) {
            lastSeenId = window.localStorage.getItem(LAST_SEEN_UPDATE_ID_KEY);
            lastSeenVersion = window.localStorage.getItem(LAST_SEEN_VERSION_KEY);
          }
        } catch (e) {
          // ignore
        }

        const isNewVersion = String(lastUpdate.version) !== String(lastSeenVersion);
        const isDifferentId = String(lastUpdate.id) !== String(lastSeenId);
        const forceShow = !!(
          lastUpdate.force_show ||
          lastUpdate.for_all ||
          lastUpdate.show_to_all ||
          lastUpdate.is_important
        );

        // Mostrar apenas se a versão for diferente OU (forceShow e presença de novo ID)
        if (isNewVersion || (forceShow && isDifferentId)) {
          setShouldShow(true);
        }
      } catch (err) {
        console.error('Erro ao verificar updates:', err);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkUpdate();
    return () => {
      mounted = false;
    };
  }, []);

  const markAsSeen = async () => {
    if (!updateData?.id || !updateData?.version) return false;
    try {
      try {
        if (typeof window !== 'undefined' && window.localStorage) {
          window.localStorage.setItem(
            LAST_SEEN_UPDATE_ID_KEY,
            String(updateData.id)
          );
          window.localStorage.setItem(
            LAST_SEEN_VERSION_KEY,
            String(updateData.version)
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

  return { shouldShow, loading, markAsSeen, updateData };
}
