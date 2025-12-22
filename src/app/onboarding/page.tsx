import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingForm } from '@/components/onboarding/OnboardingForm';
import OnboardingGate from '@/components/onboarding/OnboardingGate';

// Força a verificação sempre no banco de dados, ignorando o cache do Next.js
export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const supabase = await createClient();

  // 1. Tentamos obter o usuário no servidor. Se não houver sessão ainda
  // (por exemplo, logo após o login), NÃO redirecionamos — renderizamos
  // um componente cliente (`OnboardingGate`) que fará a revalidação no
  // navegador e decidirá se deve enviar para /login ou renderizar o
  // formulário com os dados do usuário.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    // 2. Busca o Perfil no Servidor (Fonte da Verdade) - com resiliência .maybeSingle()
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', user.id)
      .maybeSingle();

    if (profile && profile.onboarding_completed) {
      redirect('/dashboard');
    }

    return <OnboardingForm userId={user.id} userEmail={user.email || ''} />;
  }

  // Se não houver usuário no servidor, renderizar o gate no client para
  // evitar redirect loop causado pela ausência momentânea dos cookies.
  return <OnboardingGate />;
}
