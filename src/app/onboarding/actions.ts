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

function slugifySafe(input: string) {
  return String(input || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50);
}

export async function finishOnboarding(data: OnboardingData) {
  const supabase = await createClient();

  // 1. Validar Sessão
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    throw new Error('Sessão expirada. Por favor, faça login novamente.');

  try {
    // Fallbacks defensivos para evitar criação incompleta
    const safeName = (data?.name || '').trim() || 'Minha Loja';
    const baseSlug =
      slugifySafe((data?.slug || '').trim()) ||
      `catalogo-${String(user.id).slice(0, 5).toLowerCase()}`;

    // Garantir slug único sem depender do frontend
    let safeSlug = baseSlug;
    for (let i = 0; i < 5; i++) {
      const candidate = i === 0 ? safeSlug : `${baseSlug}-${i + 1}`;
      const { data: existingSlug } = await supabase
        .from('settings')
        .select('user_id')
        .eq('catalog_slug', candidate)
        .maybeSingle();
      if (!existingSlug || existingSlug.user_id === user.id) {
        safeSlug = candidate;
        break;
      }
    }

    const safeEmail = (data?.email || '').trim() || user.email || '';

    // 2. Validar se o Slug (Link) já existe
    const { data: existing } = await supabase
      .from('settings')
      .select('user_id')
      .eq('catalog_slug', safeSlug)
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
      name: safeName,
      email: safeEmail,
      phone: finalPhone,
      catalog_slug: safeSlug,
      primary_color: data.primary_color || '#10b981',
      logo_url: data.logo_url,
      updated_at: new Date().toISOString(),
    });

    if (settingsError)
      throw new Error('Falha ao salvar as configurações da loja.');

    // 4. Sincronizar com o Catálogo Público (Importante para a visibilidade do cliente)
    await syncPublicCatalog(user.id, {
      slug: safeSlug,
      store_name: safeName,
      logo_url: data.logo_url || undefined,
      primary_color: data.primary_color || '#10b981',
      phone: finalPhone,
      email: safeEmail,
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
