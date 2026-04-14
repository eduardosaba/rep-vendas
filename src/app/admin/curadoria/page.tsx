import CuradoriaClient from '@/components/admin/CuradoriaClient';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

export default async function Page() {
  // server-side: validate caller via cookies and fetch stats using service role
  const supabase = await createClient();
  const { data: userResp } = await supabase.auth.getUser();
  const user = userResp?.user;

  // fetch role from profiles
  let role: string | null = null;
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    role = profile?.role || null;
  }

  if (!user || (role !== 'master' && role !== 'admin')) {
    // render client with empty data and caller role null — client UI will show forbidden interactions
    return <CuradoriaClient initialStats={[]} callerRole={null} />;
  }

  // use service role to fetch the heavy RPC
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminClient = createServiceClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
  const { data } = await adminClient.rpc('get_users_catalog_stats');
  const stats = data || [];

  return <CuradoriaClient initialStats={stats} callerRole={role} />;
}
