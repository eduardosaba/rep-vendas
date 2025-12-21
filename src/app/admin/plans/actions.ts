'use server';

import { createClient } from '@/lib/supabase/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

// Cliente Admin para ignorar RLS e garantir escrita
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

// --- ACTION: BUSCAR PLANOS ---
export async function getPlans() {
  try {
    await requireAdminPermission();
    // Ordena por preço para ficar visualmente organizado
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

    // Validação básica
    if (!plan.name) throw new Error('O nome do plano é obrigatório');
    
    // Removemos ID se for criar novo, ou mantemos se for update
    const { data, error } = await supabaseAdmin
      .from('plans')
      .upsert({
        id: plan.id, // Se tiver ID atualiza, se não tiver cria (ou gera no banco)
        name: plan.name,
        price: plan.price,
        max_products: plan.max_products,
        active: plan.active,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/admin/plans');
    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- ACTION: EXCLUIR PLANO ---
export async function deletePlan(id: string) {
  try {
    await requireAdminPermission();

    const { error } = await supabaseAdmin
      .from('plans')
      .delete()
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/admin/plans');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}