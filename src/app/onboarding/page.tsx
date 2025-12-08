import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { OnboardingForm } from '@/components/onboarding/OnboardingForm';

// Força a verificação sempre no banco de dados, ignorando o cache do Next.js
export const dynamic = 'force-dynamic';

export default async function OnboardingPage() {
  const supabase = await createClient();

  // 1. Verifica Usuário Logado
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Busca o Perfil no Servidor (Fonte da Verdade)
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_completed')
    .eq('id', user.id)
    .single();

  // 3. Decisão de Roteamento
  // Se o perfil existe E já completou o onboarding, manda pro Dashboard.
  // Isso impede que um usuário já configurado veja esta página novamente.
  if (profile && profile.onboarding_completed) {
    redirect('/dashboard');
  }

  // 4. Se chegou aqui, é porque PRECISA configurar.
  // Renderiza o formulário interativo (Client Component).
  return <OnboardingForm userId={user.id} userEmail={user.email || ''} />;
}
