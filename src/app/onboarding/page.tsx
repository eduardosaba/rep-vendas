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
  } = await supabase.auth.getUser();

  if (user) {
    // 2. Busca o Perfil com dados iniciais e etapa atual
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed, onboarding_step, full_name, phone')
      .eq('id', user.id)
      .maybeSingle();

    // Se já completou, redireciona para o dashboard
    if (profile?.onboarding_completed) {
      redirect('/dashboard');
    }

    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Suspense
          fallback={
            <div className="animate-pulse bg-white w-full max-w-2xl h-[600px] rounded-3xl" />
          }
        >
          <OnboardingForm
            userId={user.id}
            userEmail={user.email || ''}
            initialFullName={profile?.full_name || ''}
            initialPhone={profile?.phone || ''}
            initialStep={profile?.onboarding_step || 1}
          />
        </Suspense>
      </div>
    );
  }

  // 3. Fallback para Client-side Gate
  return <OnboardingGate />;
}
