import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import SidebarPro from '@/components/admin/company/SidebarPro';

export default async function AdminCompanyLayout({
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
    .select('role,company_id')
    .eq('id', user.id)
    .maybeSingle();

  const role = String(profile?.role || '').toLowerCase();
  const canAccess = role === 'admin_company' || role === 'master';

  if (!canAccess || !profile?.company_id) {
    redirect('/admin/unauthorized');
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="flex min-h-screen">
        <SidebarPro />
        <main className="flex-1 p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
