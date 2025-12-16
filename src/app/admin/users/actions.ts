'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { logger } from '@/lib/logger';

export async function updateUserAction(formData: FormData) {
  const supabase = await createClient();

  const id = formData.get('id') as string;
  const role = (formData.get('role') as string) || 'rep';
  const license_expires_at =
    (formData.get('license_expires_at') as string) || null;

  // Verifica se quem está chamando é master
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autenticado');

  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if (!me || me.role !== 'master') {
    logger.warn('Tentativa não autorizada de atualização de usuário', {
      by: user.id,
    });
    throw new Error('Não autorizado');
  }

  const updates: any = { role };
  if (license_expires_at) updates.license_expires_at = license_expires_at;

  const { error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', id);
  if (error) {
    logger.error('Falha ao atualizar usuário', { id, error });
    throw new Error(error.message || 'Falha ao atualizar');
  }

  try {
    revalidatePath('/admin');
    revalidatePath(`/admin/users/${id}`);
  } catch (e) {
    logger.debug('Revalidate falhou', e);
  }

  // Form action handlers should return void / Promise<void>
  return;
}

export async function updateUserLicense(userId: string, formData: FormData) {
  const supabase = await createClient();

  // Verifica autenticação básica
  const {
    data: { user: currentUser },
  } = await supabase.auth.getUser();
  if (!currentUser) throw new Error('Não autenticado');

  // Extrai dados do formulário
  const plan = formData.get('plan') as string;
  const status = formData.get('status') as string;
  const endsAtRaw = formData.get('ends_at') as string;

  // Converte data se não estiver vazia
  let endsAt = null;
  if (endsAtRaw) {
    endsAt = new Date(endsAtRaw).toISOString();
  }

  // Atualiza o perfil alvo
  const { error } = await supabase
    .from('profiles')
    .update({
      plan,
      subscription_status: status,
      subscription_ends_at: endsAt,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);

  if (error) {
    throw new Error('Erro ao atualizar licença: ' + error.message);
  }

  // Atualiza os caches para refletir a mudança imediatamente
  revalidatePath('/admin');
  revalidatePath(`/admin/users/${userId}`);

  // Volta para a lista principal
  redirect('/admin');
}
