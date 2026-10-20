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
      .select('onboarding_completed, onboarding_step, full_name, phone, role, company_id, slug, email, status, plan_id')
      .eq('id', user.id)
      .maybeSingle();

    const role = String(profile?.role || '').toLowerCase();
    const isTeamRep =
      Boolean((profile as any)?.company_id) &&
      (role === 'representative' || role === 'rep' || role === 'representante');

    // Se já completou ou se for representante vinculado à distribuidora, redireciona para o dashboard
    if (profile?.onboarding_completed || isTeamRep) {
      redirect('/dashboard');
    }

    // 3. Busca configurações pré-existentes de loja/catálogo (caso criadas pela Torre de Controle)
    const { data: settings } = await supabase
      .from('settings')
      .select('name, catalog_slug, phone, email, primary_color, logo_url')
      .eq('user_id', user.id)
      .maybeSingle();

    // Determina se o usuário é do teste (auto-cadastro sem plano) ou cliente cadastrado manualmente
    const isTrial = profile?.status === 'trial' && !profile?.plan_id;

    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <Suspense
          fallback={
            <div className="animate-pulse bg-white w-full max-w-2xl h-[600px] rounded-3xl" />
          }
        >
          <OnboardingForm
            userId={user.id}
            userEmail={profile?.email || user.email || settings?.email || ''}
            initialFullName={profile?.full_name || settings?.name || ''}
            initialPhone={profile?.phone || settings?.phone || ''}
            initialSlug={profile?.slug || settings?.catalog_slug || ''}
            initialEmail={profile?.email || settings?.email || user.email || ''}
            initialStep={profile?.onboarding_step || 1}
            initialRole={profile?.role || ''}
            isTrial={isTrial}
            initialCompanyName={profile?.full_name ? `${profile.full_name} Representações` : ''}
            initialPrimaryColor={settings?.primary_color || undefined}
            initialLogoUrl={settings?.logo_url || null}
          />
        </Suspense>
      </div>
    );
  }

  // 3. Fallback para Client-side Gate
  return <OnboardingGate />;
}
