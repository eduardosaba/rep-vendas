'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function SessionGuard() {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let mounted = true;

    const ensureSession = async () => {
      // tentativas para dar tempo ao cliente inicializar a sessão
      const maxAttempts = 6;
      for (let i = 0; i < maxAttempts && mounted; i++) {
        try {
          const { data: userData } = await supabase.auth.getUser();
          if (userData?.user) {
            if (mounted) setChecked(true);
            return;
          }

          const { data: sessionData } = await supabase.auth.getSession();
          if (sessionData?.session?.user) {
            if (mounted) setChecked(true);
            return;
          }
        } catch (e) {
          // ignore e faça nova tentativa
        }

        // esperar um pouco antes da próxima tentativa
        // aumenta a chance do Supabase client inicializar
        // eslint-disable-next-line no-await-in-loop
        await new Promise((r) => setTimeout(r, 250));
      }

      // se depois de tentativas não houver sessão, redireciona para login
      if (mounted) {
        router.replace('/login');
      }
    };

    ensureSession();

    return () => {
      mounted = false;
    };
  }, [router]);

  // Não renderiza nada visível; apenas garante estado.
  return null;
}
