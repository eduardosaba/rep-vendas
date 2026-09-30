'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { OnboardingForm } from './OnboardingForm';

export default function OnboardingGate() {
  const router = useRouter();
  const supabase = createClient();
  const [status, setStatus] = useState<'loading' | 'no-user' | 'ready'>(
    'loading'
  );
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        const {
          data: { user: clientUser },
        } = await supabase.auth.getUser();

        if (!mounted) return;

        if (!clientUser) {
          // Não há sessão do lado do cliente — redireciona para login
          setStatus('no-user');
          router.replace('/login');
          return;
        }

        // Verifica se o perfil já completou onboarding ou é representante de equipe
        const { data: profile } = await supabase
          .from('profiles')
          .select('role, company_id, onboarding_completed')
          .eq('id', clientUser.id)
          .maybeSingle();

        const role = String(profile?.role || '').toLowerCase();
        const isTeamRep =
          Boolean((profile as any)?.company_id) &&
          (role === 'representative' || role === 'rep' || role === 'representante');

        if (profile?.onboarding_completed || isTeamRep) {
          router.replace('/dashboard');
          return;
        }

        // Usuário encontrado: renderiza o formulário de onboarding no client
        setUser(clientUser);
        setStatus('ready');
      } catch (err) {
        // Em caso de erro, fallback para login
        setStatus('no-user');
        router.replace('/login');
      }
    })();

    return () => {
      mounted = false;
    };
  }, [router, supabase]);

  if (status === 'loading') return null;
  if (status === 'no-user') return null;

  return <OnboardingForm userId={user.id} userEmail={user.email ?? ''} />;
}
