import { useEffect, useState, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  LAST_SEEN_UPDATE_ID_KEY,
  LAST_SEEN_VERSION_KEY,
} from '@/config/updates-config';

export function useWelcomeManager() {
  const [shouldShow, setShouldShow] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updateData, setUpdateData] = useState<any | null>(null);
  const checkUpdate = useCallback(async (mounted: boolean) => {
    try {
      const supabase = createClient();
      const { data: lastUpdate, error } = await supabase
        .from('system_updates')
        .select('*')
        .eq('active', true)
        .order('date', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (error || !lastUpdate || !mounted) {
        setLoading(false);
        return;
      }

      setUpdateData(lastUpdate);

      // Leitura segura do localStorage
      let lastSeenId = '';
      let lastSeenVersion = '';
      if (typeof window !== 'undefined') {
        try {
          lastSeenId = localStorage.getItem(LAST_SEEN_UPDATE_ID_KEY) || '';
          lastSeenVersion = localStorage.getItem(LAST_SEEN_VERSION_KEY) || '';
        } catch (e) {
          // ignore localStorage errors
        }
      }

      const isNewId = String(lastUpdate.id) !== String(lastSeenId);
      const isNewVersion = String(lastUpdate.version) !== String(lastSeenVersion);
      const forceShow = !!(lastUpdate.force_show || lastUpdate.is_important);

      // Mostrar apenas se for um ID que nunca vimos. Se forceShow, respeita o ID.
      if (isNewId || (forceShow && isNewVersion)) {
        setShouldShow(true);
      } else {
        setShouldShow(false);
      }
    } catch (err) {
      console.error('Erro ao verificar updates:', err);
    } finally {
      if (mounted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    checkUpdate(mounted);
    return () => {
      mounted = false;
    };
  }, [checkUpdate]);

  const markAsSeen = async () => {
    if (!updateData?.id) return false;
    try {
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem(LAST_SEEN_UPDATE_ID_KEY, String(updateData.id));
          localStorage.setItem(LAST_SEEN_VERSION_KEY, String(updateData.version));
        } catch (e) {
          // ignore localStorage errors
        }
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
