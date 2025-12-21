/**
 * Sincroniza dados de public_catalogs quando settings é atualizado
 * Mantém a tabela pública sempre atualizada com os dados de branding
 */

import { createClient as createAnonClient } from '@/lib/supabase/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';

export interface SyncCatalogData {
  slug: string;
  store_name: string;
  logo_url?: string;
  primary_color?: string;
  secondary_color?: string;
  footer_message?: string;
}

/**
 * Sincroniza ou cria entrada em public_catalogs baseado em settings
 * Chamado quando o usuário atualiza configurações no dashboard
 */
export async function syncPublicCatalog(userId: string, data: SyncCatalogData) {
  // Usar service role para garantir permissões de escrita em todas as tabelas
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

  let supabase: any;
  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    supabase = createServiceClient(
      SUPABASE_URL,
      SUPABASE_SERVICE_ROLE_KEY as string
    );
  } else {
    // fallback para client anônimo (apenas para ambientes de desenvolvimento)
    supabase = await createAnonClient();
  }

  // Verifica se já existe um catálogo para este usuário
  const { data: existing } = await supabase
    .from('public_catalogs')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (existing) {
    // Atualiza catálogo existente
    const { error } = await supabase
      .from('public_catalogs')
      .update({
        slug: data.slug,
        store_name: data.store_name,
        logo_url: data.logo_url,
        primary_color: data.primary_color || '#2563eb',
        secondary_color: data.secondary_color || '#3b82f6',
        footer_message: data.footer_message,
        is_active: true,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', userId);

    if (error) {
      console.error('Erro ao atualizar public_catalog:', error);
      throw error;
    }
  } else {
    // Cria novo catálogo
    const { error } = await supabase.from('public_catalogs').insert({
      user_id: userId,
      slug: data.slug,
      store_name: data.store_name,
      logo_url: data.logo_url,
      primary_color: data.primary_color || '#2563eb',
      secondary_color: data.secondary_color || '#3b82f6',
      footer_message: data.footer_message,
      is_active: true,
    });

    if (error) {
      console.error('Erro ao criar public_catalog:', error);
      throw error;
    }
  }

  return { success: true };
}

/**
 * Desativa o catálogo público do usuário
 * Útil para "ocultar" temporariamente a loja sem deletar dados
 */
export async function deactivatePublicCatalog(userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('public_catalogs')
    .update({ is_active: false })
    .eq('user_id', userId);

  if (error) {
    console.error('Erro ao desativar catálogo:', error);
    throw error;
  }

  return { success: true };
}

/**
 * Reativa o catálogo público do usuário
 */
export async function activatePublicCatalog(userId: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from('public_catalogs')
    .update({ is_active: true })
    .eq('user_id', userId);

  if (error) {
    console.error('Erro ao ativar catálogo:', error);
    throw error;
  }

  return { success: true };
}
