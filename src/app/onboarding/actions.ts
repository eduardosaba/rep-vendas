'use server';

import { createClient } from '@/lib/supabase/server';
import { syncPublicCatalog } from '@/lib/sync-public-catalog';
import { revalidatePath } from 'next/cache';

type OnboardingData = {
  name: string;
  email: string;
  phone: string;
  slug: string;
  primary_color: string;
  logo_url: string | null;
};

export async function finishOnboarding(data: OnboardingData) {
  const supabase = await createClient();

  // 1. Validar Sessão
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    throw new Error('Sessão expirada. Por favor, faça login novamente.');

  try {
    // 2. Validar se o Slug (Link) já existe
    const { data: existing } = await supabase
      .from('settings')
      .select('user_id')
      .eq('catalog_slug', data.slug.toLowerCase().trim())
      .maybeSingle();

    if (existing && existing.user_id !== user.id) {
      throw new Error(
        'Este link de catálogo já está em uso por outro representante.'
      );
    }

    // 3. Salvar Configurações (Upsert)
    const { normalizePhone } = await import('@/lib/phone');
    const finalPhone = normalizePhone(data.phone);

    const { error: settingsError } = await supabase.from('settings').upsert({
      user_id: user.id,
      name: data.name,
      email: data.email,
      phone: finalPhone,
      catalog_slug: data.slug.toLowerCase().trim(),
      primary_color: data.primary_color,
      logo_url: data.logo_url,
      updated_at: new Date().toISOString(),
    });

    if (settingsError)
      throw new Error('Falha ao salvar as configurações da loja.');

    // 4. Sincronizar com o Catálogo Público (Importante para a visibilidade do cliente)
    await syncPublicCatalog(user.id, {
      slug: data.slug.toLowerCase().trim(),
      store_name: data.name,
      logo_url: data.logo_url || undefined,
      primary_color: data.primary_color,
    });

    // 5. Finalizar processo no perfil
    const { error: profileError } = await supabase
      .from('profiles')
      .update({ onboarding_completed: true })
      .eq('id', user.id);

    if (profileError) throw new Error('Erro ao atualizar status do perfil.');

    // 6. Limpar Cache do Next.js para forçar renderização do Dashboard
    // Revalidamos tudo que depende do estado do usuário
    revalidatePath('/', 'layout');
    revalidatePath('/dashboard', 'page');
    revalidatePath('/onboarding', 'page');

    return { success: true };
  } catch (err: any) {
    console.error('[Onboarding Action Error]:', err.message);
    throw err;
  }
}
