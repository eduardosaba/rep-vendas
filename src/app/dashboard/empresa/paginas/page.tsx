import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import CompanyPagesManager from '@/components/dashboard/company/CompanyPagesManager';

export const dynamic = 'force-dynamic';

export default async function DashboardEmpresaPaginasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let finalUser = user;
  if (!finalUser) {
    try {
      const fallback = await getServerUserFallback();
      if (fallback) finalUser = fallback as any;
    } catch {
      // ignore fallback errors
    }
  }

  if (!finalUser) {
    redirect('/login');
  }

  return (
    <div className="space-y-6">
      <CompanyPagesManager />
    </div>
  );
}
