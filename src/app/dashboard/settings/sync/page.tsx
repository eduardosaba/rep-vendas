import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import SyncManagerClient from './SyncManagerClient';

export default async function SyncPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(
          cookiesToSet: Array<{ name: string; value: string; options: any }>
        ) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

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
