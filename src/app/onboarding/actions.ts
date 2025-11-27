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
  const supabase = await createClient();

  // Pegamos o usuário autenticado no servidor
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('Usuário não autenticado');
  }

  // 1. VERIFICAÇÃO DE UNICIDADE DO SLUG
  // Antes de salvar, verificamos se este link já pertence a OUTRO usuário
  const { data: existingSlug } = await supabase
    .from('settings')
    .select('user_id')
    .eq('catalog_slug', data.slug)
    .single();

  // Se encontrou alguém com esse slug E não é o próprio usuário atual
  if (existingSlug && existingSlug.user_id !== user.id) {
    throw new Error(
      'Este link da loja já está em uso. Por favor, altere o "Link do Catálogo" para outro nome.'
    );
  }

  // 2. Atualizar a tabela settings
  const { error: settingsError } = await supabase.from('settings').upsert(
    {
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
    },
    { onConflict: 'user_id' }
  );

  if (settingsError) {
    // Se ainda der erro de duplicidade (raro com a checagem acima, mas possível em concorrência)
    if (settingsError.code === '23505') {
      throw new Error('Este link da loja já está em uso. Tente outro.');
    }
    throw new Error(`Erro ao salvar configurações: ${settingsError.message}`);
  }

  // 3. Marcar onboarding como completo no perfil
  const { error: profileError } = await supabase
    .from('profiles')
    .update({ onboarding_completed: true })
    .eq('id', user.id);

  if (profileError) {
    throw new Error(`Erro ao atualizar perfil: ${profileError.message}`);
  }

  // 4. Invalidar cache
  revalidatePath('/', 'layout');

  return { success: true };
}
