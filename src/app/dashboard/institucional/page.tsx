import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import SystemSettingsForm from '@/components/dashboard/SystemSettingsForm';

export const dynamic = 'force-dynamic';

export default async function DashboardInstitucionalPage() {
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
      <div className="rounded-2xl border border-blue-200 bg-blue-50/70 p-4 dark:bg-slate-900/50 dark:border-blue-900/50">
        <h2 className="text-base font-black text-blue-900 dark:text-blue-100 flex items-center gap-2">
          🏢 Gestão Institucional da Distribuidora
        </h2>
        <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">
          Configure a identidade da marca, história, imagens de capa, redes sociais e catálogo PDF oficial da empresa.
        </p>
      </div>

      <SystemSettingsForm initialTab="institucional" context="company" targetId={finalUser.id} />
    </div>
  );
}
