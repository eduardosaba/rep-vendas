import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export async function createDemoCatalog(supabaseAdmin: any, companyId: string) {
  const products = [
    // Armações
    { sku: 'RV001', name: 'Armação Ray Vision RV001', category: 'Armações', price: 150.00, cost_price: 50.00, stock: 100 },
    { sku: 'RV002', name: 'Armação Ray Vision RV002', category: 'Armações', price: 160.00, cost_price: 55.00, stock: 80 },
    { sku: 'UV001', name: 'Armação Urban UV001', category: 'Armações', price: 200.00, cost_price: 70.00, stock: 50 },
    { sku: 'CL001', name: 'Armação Classic CL001', category: 'Armações', price: 120.00, cost_price: 40.00, stock: 150 },
    { sku: 'PR001', name: 'Armação Premium PR001', category: 'Armações', price: 350.00, cost_price: 120.00, stock: 30 },
    // Lentes
    { sku: 'L-CR39', name: 'Lente CR 39', category: 'Lentes', price: 80.00, cost_price: 25.00, stock: 500 },
    { sku: 'L-BLUE', name: 'Lente Blue Filter', category: 'Lentes', price: 150.00, cost_price: 50.00, stock: 300 },
    { sku: 'L-TRANS', name: 'Lente Transitions', category: 'Lentes', price: 400.00, cost_price: 180.00, stock: 100 },
    { sku: 'L-MULTI', name: 'Lente Multifocal', category: 'Lentes', price: 600.00, cost_price: 250.00, stock: 80 },
    { sku: 'L-PROG', name: 'Lente Progressiva', category: 'Lentes', price: 800.00, cost_price: 350.00, stock: 50 },
  ];

  const productsToInsert = products.map(p => ({
    company_id: companyId,
    sku: p.sku,
    name: p.name,
    description: `Produto de Teste: ${p.category}`,
    price: p.price,
    cost_price: p.cost_price,
    stock: p.stock,
    is_active: true
  }));

  const { error } = await supabaseAdmin
    .from('products')
    .insert(productsToInsert);

  if (error) {
    throw new Error(error.message || 'Erro ao popular o catálogo de 10 SKUs.');
  }

  return { success: true };
}
