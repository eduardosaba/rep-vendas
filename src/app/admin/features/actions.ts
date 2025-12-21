'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Cliente Admin (Ignora RLS)
const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Helper de Permissão
async function requireAdminPermission() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'master') {
    throw new Error('Acesso negado.');
  }
}

// --- BUSCAR FLAGS ---
export async function getFeatureFlags() {
  try {
    await requireAdminPermission();
    const { data, error } = await supabaseAdmin
      .from('feature_flags')
      .select('*')
      .order('key');

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- ALTERAR STATUS (TOGGLE) ---
export async function toggleFeatureFlag(id: string, newValue: boolean) {
  try {
    await requireAdminPermission();
    const { error } = await supabaseAdmin
      .from('feature_flags')
      .update({ is_enabled: newValue })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/admin/features');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- CRIAR NOVA FLAG ---
export async function createFeatureFlag(data: { key: string; description: string }) {
  try {
    await requireAdminPermission();
    
    // Validação simples
    if (!data.key || !data.description) throw new Error('Preencha todos os campos');
    
    // Formata a key para snake_case (ex: MINHA FEATURE -> minha_feature)
    const formattedKey = data.key.trim().toLowerCase().replace(/\s+/g, '_');

    const { data: newFlag, error } = await supabaseAdmin
      .from('feature_flags')
      .insert({
        key: formattedKey,
        description: data.description,
        is_enabled: false // Padrão: desativado
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/admin/features');
    return { success: true, data: newFlag };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- EXCLUIR FLAG ---
export async function deleteFeatureFlag(id: string) {
  try {
    await requireAdminPermission();
    const { error } = await supabaseAdmin
      .from('feature_flags')
      .delete()
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/admin/features');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}