import { redirect } from 'next/navigation';
import SyncManagerClient from './SyncManagerClient';
import { createClient } from '@/lib/supabase/server';

export default async function SyncPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }
  // Verifica papel do usuário (se existir) — admins têm visão global
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = Boolean(
    profile && (profile.role === 'admin' || profile.role === 'master')
  );

  // Passamos `userId` e `isAdmin` para o componente cliente. Usuários normais
  // verão apenas dados relacionados ao seu `user.id`; admins podem optar por
  // ver estatísticas globais quando o cliente suportar essa opção.
  return <SyncManagerClient userId={user.id} isAdmin={isAdmin} />;
}
