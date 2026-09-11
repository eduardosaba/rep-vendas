import { createClient } from '@/lib/supabase/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import { redirect } from 'next/navigation';
import SyncManagerClient from './SyncManagerClient';

export default async function SyncPage() {
  const supabase = await createClient();

  let user = null;
  const { data: userResp } = await supabase.auth.getUser();
  user = userResp?.user;

  if (!user) {
    user = await getServerUserFallback();
  }

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const isAdmin = Boolean(
    profile && (profile.role === 'admin' || profile.role === 'master')
  );

  return <SyncManagerClient userId={user.id} isAdmin={isAdmin} />;
}
