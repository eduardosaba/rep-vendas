import { createClient } from '@/lib/supabase/server';
import BulkPriceAdjuster from '@/components/admin/BulkPriceAdjuster';

export default async function Page() {
  const supabase = await createClient();

  // Busca brands
  const { data } = await supabase
    .from('products')
    .select('brand')
    .neq('brand', null);
  const brands = Array.from(
    new Set((data || []).map((r: any) => r.brand))
  ).filter(Boolean) as string[];

  // Busca role do usuário autenticado
  const {
    data: { user },
  } = await supabase.auth.getUser();
  let userRole = null;

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    userRole = profile?.role || null;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Painel de Reajuste Global</h1>
      <BulkPriceAdjuster brands={brands} userRole={userRole} />
    </div>
  );
}
