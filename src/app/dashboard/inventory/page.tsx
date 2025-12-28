import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { InventoryRow } from './InventoryRow';
import { InventoryHeader } from './InventoryHeader';

export const dynamic = 'force-dynamic';

export default async function InventoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: settings } = await supabase
    .from('settings')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!settings?.manage_stock) redirect('/dashboard');

  const { data: products } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user.id)
    .eq('manage_stock', true)
    .eq('is_active', true)
    .order('stock_quantity', { ascending: true });

  return (
    <div className="p-4 md:p-8 bg-gray-50 min-h-screen">
      {/* Cabeçalho com o botão de PDF */}
      <InventoryHeader products={products || []} store={settings} />

      <div className="bg-white rounded-[2.5rem] border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50/50 border-b border-gray-100">
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Produto
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Status
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">
                  Saldo
                </th>
                <th className="px-6 py-5 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">
                  Ajuste
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {products?.map((product) => (
                <InventoryRow key={product.id} product={product} />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
