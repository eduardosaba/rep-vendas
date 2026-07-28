import { notFound, redirect } from 'next/navigation';
import { getActiveUserId } from '@/lib/auth-utils';
import { createClient } from '@/lib/supabase/server';
import { FactoryLineImportClient } from './components/FactoryLineImportClient';
import { isAdminRole } from '@/lib/auth/roles';

export default async function FactoryLineImportPage() {
  const isEnabled = process.env.FACTORY_LINE_IMPORT_ENABLED === 'true';

  if (!isEnabled) {
    notFound();
  }

  const supabase = await createClient();
  const userId = await getActiveUserId();

  if (!userId) {
    redirect('/auth/login');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .single();

  if (!profile || !isAdminRole(profile.role)) {
    redirect('/admin/unauthorized');
  }

  // Fetch unique brands across the database for the dropdown (Optional, but useful)
  // For now, we will let the user type the brand or fetch distinct from products.
  // Actually fetching distinct brands from 100k products can be slow in Supabase without a specific view.
  // We'll let the user type the brand name for this first version.

  return (
    <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Atualização de Linha da Fábrica</h2>
      </div>
      <p className="text-muted-foreground">
        Importe uma planilha Excel fornecida pela fábrica para atualizar os produtos no catálogo de todos os representantes.
      </p>

      <FactoryLineImportClient />
    </div>
  );
}
