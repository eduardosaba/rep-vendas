'use client';

import React from 'react';
import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';

// PresenceProvider: faz heartbeat na tabela `user_status` para indicar presença
export default function PresenceProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    const supabase = createClient();
    let intervalId: number | undefined;
    let mounted = true;
    let connectionId: string | null = null;

    async function upsertPresence() {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (!user) return;
        connectionId =
          connectionId ??
          `${user.id}-${Math.random().toString(36).slice(2, 8)}`;
        await supabase.from('user_status').upsert(
          {
            user_id: user.id,
            is_online: true,
            last_seen: new Date().toISOString(),
            connection_id: connectionId,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );
      } catch (err) {
        // não bloqueia a UI
      }
    }

    // primeira chamada
    upsertPresence();
    // heartbeat a cada 20s
    intervalId = window.setInterval(upsertPresence, 20_000);

    const handleUnload = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const user = data?.user;
        if (!user) return;
        await supabase
          .from('user_status')
          .update({ is_online: false, last_seen: new Date().toISOString() })
          .eq('user_id', user.id);
      } catch (err) {
        // ignore
      }
    };

    window.addEventListener('beforeunload', handleUnload);

    return () => {
      mounted = false;
      if (intervalId) clearInterval(intervalId);
      window.removeEventListener('beforeunload', handleUnload);
    };
  }, []);

  return <>{children}</>;
}
