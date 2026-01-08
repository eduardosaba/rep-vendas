import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingForm } from '@/components/onboarding/OnboardingForm';
import OnboardingGate from '@/components/onboarding/OnboardingGate';
import { Suspense } from 'react';

export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const supabase = await createClient();

  // 1. Obter usuário de forma segura
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (user) {
    // 2. Busca o Perfil com foco na flag de conclusão
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();

    // Se já completou, não há motivo para estar aqui
    if (profile?.onboarding_completed) {
      redirect('/dashboard');
    }

    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Suspense
          fallback={
            <div className="animate-pulse bg-white w-full max-w-2xl h-[600px] rounded-3xl" />
          }
        >
          <OnboardingForm userId={user.id} userEmail={user.email || ''} />
        </Suspense>
      </div>
    );
  }

  // 3. Fallback para Client-side Gate (Evita tela branca se o cookie demorar a propagar)
  // O OnboardingGate fará uma nova tentativa no cliente antes de mandar para /login
  return <OnboardingGate />;
}
