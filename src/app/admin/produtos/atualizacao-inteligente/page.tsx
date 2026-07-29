import { notFound, redirect } from 'next/navigation';
import { getActiveUserId } from '@/lib/auth-utils';
import { createClient } from '@/lib/supabase/server';
import { isAdminRole } from '@/lib/auth/roles';
import { SmartUpdateClient } from './components/SmartUpdateClient';

export default async function SmartUpdatePage() {
  const isEnabled = process.env.FACTORY_LINE_IMPORT_ENABLED === 'true';

  if (!isEnabled) {
    notFound();
  }

  const supabase = await createClient();
  const userId = await getActiveUserId();

  if (!userId) {
    redirect('/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .maybeSingle();

  if (!profile || !isAdminRole(profile.role)) {
    redirect('/admin/unauthorized');
  }

  // Fetch companies & users for scope selector dropdowns
  const { data: companies } = await supabase.from('companies').select('id, name').order('name');
  const { data: users } = await supabase.from('profiles').select('id, email, full_name').order('email');

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Motor de Atualização Inteligente por Planilha</h2>
      </div>
      <p className="text-slate-500 dark:text-slate-400">
        Importe planilhas Excel em qualquer formato, configure identificadores, monte filtros dinâmicos e aplique atualizações em lote de forma auditada e reversível.
      </p>

      <SmartUpdateClient
        availableCompanies={companies || []}
        availableUsers={users || []}
      />
    </div>
  );
}
