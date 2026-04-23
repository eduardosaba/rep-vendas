import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import SystemSettingsForm from '@/components/dashboard/SystemSettingsForm';

export const dynamic = 'force-dynamic';

export default async function DashboardEmpresaPage() {
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

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', finalUser.id)
    .maybeSingle();

  const role = String((profile as any)?.role || '');
  const isCompanyAdmin = ['admin_company', 'master', 'admin'].includes(role);

  // Apenas admins da empresa acessam esta área de gestão da distribuidora.
  if (!isCompanyAdmin) {
    redirect('/dashboard');
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
        <p className="text-sm font-medium text-amber-800">
          <strong>Modo Distribuidora:</strong> as alterações feitas aqui refletem no catálogo global e na identidade visual aplicada aos representantes vinculados.
        </p>
      </div>

      <SystemSettingsForm context="company" targetId={finalUser.id} />
    </div>
  );
}
