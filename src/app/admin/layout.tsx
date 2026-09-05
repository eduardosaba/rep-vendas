import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import AdminLayoutClient from './AdminLayoutClient';
import { isAdminRole } from '@/lib/auth/roles';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  const role = profile?.role;

  if (!isAdminRole(role)) {
    redirect('/dashboard');
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
