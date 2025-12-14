'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

// Definimos o tipo dos dados que vamos receber
type OnboardingData = {
  name: string;
  email: string;
  phone: string;
  slug: string;
  primary_color: string;
  logo_url: string | null;
};

export async function finishOnboarding(data: OnboardingData) {
  const ensureSupabaseEnv = () => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      // eslint-disable-next-line no-console
      console.error(
        'Faltam variáveis de ambiente Supabase: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
      throw new Error(
        'Configuração inválida: verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    }
  };

  ensureSupabaseEnv();
  const supabase = await createClient();

  // Pegamos o usuário autenticado no servidor
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  try {
    // 1. VERIFICAÇÃO DE UNICIDADE DO SLUG
    const { data: existingSlug, error: slugError } = await supabase
      .from('settings')
      .select('user_id')
      .eq('catalog_slug', data.slug)
      .maybeSingle();

    if (slugError) {
      console.error('finishOnboarding: slug check error', slugError);
      throw new Error('Erro ao verificar disponibilidade do link da loja.');
    }

    if (
      existingSlug &&
      (existingSlug as any).user_id &&
      (existingSlug as any).user_id !== user.id
    ) {
      throw new Error(
        'Este link da loja já está em uso. Por favor, altere o "Link do Catálogo" para outro nome.'
      );
    }

    // 2. Atualizar a tabela settings (upsert por user_id)
    const { data: upsertData, error: settingsError } = await supabase
      .from('settings')
      .upsert({
        user_id: user.id,
        name: data.name,
        email: data.email,
        phone: data.phone,
        catalog_slug: data.slug,
        primary_color: data.primary_color,
        logo_url: data.logo_url,
        header_color: '#FFFFFF',
        show_filter_price: true,
        show_shipping: true,
        updated_at: new Date().toISOString(),
      });

    if (settingsError) {
      console.error('finishOnboarding: settings upsert failed', settingsError);
      if ((settingsError as any).code === '23505') {
        throw new Error('Este link da loja já está em uso. Tente outro.');
      }
      throw new Error(
        `Erro ao salvar configurações: ${(settingsError as any).message || JSON.stringify(settingsError)}`
      );
    }

    // 3. Marcar onboarding como completo no perfil
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id);

    if (profileError) {
      console.error('finishOnboarding: profile update failed', profileError);
      throw new Error(
        `Erro ao atualizar perfil: ${(profileError as any).message || JSON.stringify(profileError)}`
      );
    }

    // 4. Invalidar cache: revalidamos a raiz, o dashboard e o catálogo
    // para garantir que mudanças de branding (cor/logo/slug) sejam visíveis
    // imediatamente nas páginas server-rendered.
    try {
      revalidatePath('/');
    } catch (e) {
      console.warn('finishOnboarding: revalidatePath(/) warning', e);
    }

    try {
      // Revalidar dashboard
      revalidatePath('/dashboard');
    } catch (e) {
      console.warn('finishOnboarding: revalidatePath(/dashboard) warning', e);
    }

    try {
      // Revalidar o catálogo público para o slug criado/atualizado
      if (data.slug) revalidatePath(`/catalogo/${data.slug}`);
    } catch (e) {
      console.warn(
        'finishOnboarding: revalidatePath(/catalogo/:slug) warning',
        e
      );
    }

    return { success: true };
  } catch (err) {
    console.error('finishOnboarding: unexpected error', err);
    throw err;
  }
}
