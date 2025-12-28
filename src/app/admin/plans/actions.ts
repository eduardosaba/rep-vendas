'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Cliente Admin para ignorar RLS e garantir escrita em tabelas sensíveis
const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

/**
 * Helper de Permissão
 * Garante que apenas usuários com role 'admin' ou 'master' acessem estas funções
 */
async function requireAdminPermission() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado.');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'admin' && profile?.role !== 'master') {
    throw new Error('Acesso negado. Permissão insuficiente.');
  }
}

// --- ACTION: BUSCAR PLANOS ---
export async function getPlans() {
  try {
    await requireAdminPermission();

    // Ordena por preço para manter a hierarquia visual (do mais barato ao mais caro)
    const { data, error } = await supabaseAdmin
      .from('plans')
      .select('*')
      .order('price', { ascending: true });

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- ACTION: SALVAR PLANO (Cria ou Atualiza) ---
export async function upsertPlan(plan: any) {
  try {
    await requireAdminPermission();

    // Validação básica de integridade
    if (!plan.name) throw new Error('O nome do plano é obrigatório');

    /**
     * O .upsert identifica automaticamente se deve inserir ou atualizar
     * baseando-se na presença ou ausência do 'id'.
     */
    const { data, error } = await supabaseAdmin
      .from('plans')
      .upsert({
        id: plan.id, // Se for nulo, o Supabase gera um novo UUID
        name: plan.name,
        price: plan.price,
        max_products: plan.max_products,
        active: plan.active,

        // --- NOVAS FUNCIONALIDADES (FEATURE FLAGS) ---
        has_custom_fonts: plan.has_custom_fonts ?? false,
        remove_branding: plan.remove_branding ?? false,
        has_excel_sync: plan.has_excel_sync ?? false,

        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    // Limpa o cache das páginas que utilizam estes dados
    revalidatePath('/admin/plans');
    revalidatePath('/admin/plans/features');

    return { success: true, data };
  } catch (error: any) {
    console.error('Erro no upsertPlan:', error);
    return { success: false, error: error.message };
  }
}

// --- ACTION: EXCLUIR PLANO ---
export async function deletePlan(id: string) {
  try {
    await requireAdminPermission();

    const { error } = await supabaseAdmin.from('plans').delete().eq('id', id);

    if (error) throw error;

    revalidatePath('/admin/plans');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
