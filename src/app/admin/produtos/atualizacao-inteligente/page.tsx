import { notFound, redirect } from 'next/navigation';
import { getActiveUserId } from '@/lib/auth-utils';
import { createClient } from '@/lib/supabase/server';
import { isAdminRole } from '@/lib/auth/roles';
import { SmartUpdateClient } from './components/SmartUpdateClient';

export default async function SmartUpdatePage() {
  const isEnabled = process.env.PRODUCT_UPDATE_ENGINE_ENABLED !== 'false';

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
    .select('role, company_id')
    .eq('id', userId)
    .maybeSingle();

  const role = profile?.role || 'representative';
  const isMasterOrAdmin = role === 'master' || role === 'admin';
  const isCompanyAdmin = role === 'company_admin' || role === 'admin_company';

  // Allow representatives, admins, and masters to access SmartUpdate
  // (Representatives use Operational Mode for their own products)

  // Fetch companies, users & brands for scope selector dropdowns
  const { data: companies } = await supabase.from('companies').select('id, name').order('name');
  const { data: users } = await supabase.from('profiles').select('id, email, full_name').order('email');
  const { data: brands } = await supabase.from('brands').select('id, name').order('name');

  const availableScopes = isMasterOrAdmin
    ? ['PLATFORM_GLOBAL', 'GLOBAL', 'ORGANIZATION', 'COMPANY']
    : isCompanyAdmin
    ? ['ORGANIZATION', 'COMPANY']
    : ['USER'];

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Motor de Atualização Inteligente por Planilha</h2>
      </div>
      <p className="text-slate-500 dark:text-slate-400">
        Importe planilhas Excel em qualquer formato, configure identificadores (Referência / EAN), monte filtros e aplique atualizações em lote de forma auditada e reversível.
      </p>

      <SmartUpdateClient
        availableCompanies={companies || []}
        availableUsers={users || []}
        availableBrands={brands || []}
        availableScopes={availableScopes}
        userRole={role}
        currentUserId={userId}
      />
    </div>
  );
}
