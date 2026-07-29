import { redirect } from 'next/navigation';
import AdminLayoutClient from './AdminLayoutClient';
import { isAdminRole } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';

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
    .single();

  const role = profile?.role;

  if (!isAdminRole(role)) {
    redirect('/admin/unauthorized');
  }

  return <AdminLayoutClient>{children}</AdminLayoutClient>;
}
