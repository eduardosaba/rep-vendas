import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminLayoutClient from './AdminLayoutClient';
import { isGlobalAdmin } from '@/lib/auth/roles';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  console.log('[ADMIN AUTH]', {
    hasUser: !!user,
    userId: user?.id,
  });

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_active')
    .eq('id', user.id)
    .maybeSingle();

  if (profile && profile.is_active === false) {
    redirect('/login?error=account_disabled');
  }

  const role = profile?.role;

  console.log('[ADMIN ROLE]', {
    userId: user?.id,
    role: profile?.role,
    isGlobalAdmin: isGlobalAdmin(profile?.role),
  });

  if (!isGlobalAdmin(role)) {
    redirect('/dashboard');
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
