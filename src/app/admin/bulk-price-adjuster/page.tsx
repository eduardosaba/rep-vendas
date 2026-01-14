import { createClient } from '@/lib/supabase/server';
import BulkPriceAdjuster from '@/components/admin/BulkPriceAdjuster';

export default async function Page() {
  const supabase = await createClient();
  const { data } = await supabase
    .from('products')
    .select('brand')
    .neq('brand', null);
  const brands = Array.from(
    new Set((data || []).map((r: any) => r.brand))
  ).filter(Boolean) as string[];

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Painel de Reajuste Global</h1>
      <BulkPriceAdjuster brands={brands} />
    </div>
  );
}
