import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function getCatalogProducts(userId: string) {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .maybeSingle();

  let query = supabase.from('products').select('*');

  if (profile?.company_id) {
    query = query.eq('company_id', profile.company_id);
  } else {
    query = query.eq('user_id', userId);
  }

  // Only return available products (either not managed stock or stock > 0)
  query = query.filter('manage_stock', 'eq', true).or('stock_quantity.gt.0,manage_stock.eq.true,manage_stock.eq.false');

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Decrement stock atomically; returns true if success, false if insufficient stock
export async function decreaseStock(productId: string, qty: number) {
  if (!qty || qty <= 0) return true;
  // Prefer a DB-side RPC that is atomic
  try {
    const { data, error } = await supabaseAdmin.rpc('decrement_stock_atomic', { p_product_id: productId, p_qty: qty } as any);
    if (error) throw error;
    // Depending on Postgres/RPC mapping, data may be [true] or true
    if (Array.isArray(data)) return !!data[0];
    return !!data;
  } catch (rpcErr) {
    // Fallback: try a conditional update via supabase-admin
    try {
      const { data: upd, error: upErr } = await supabaseAdmin
        .from('products')
        .update({ stock_quantity: (supabaseAdmin as any).raw ? (supabaseAdmin as any).raw('stock_quantity - ?', [qty]) : undefined })
        .filter('stock_quantity', 'gte', qty)
        .eq('id', productId)
        .select('id,stock_quantity');

      if (upErr) return false;
      return !!(upd && (upd as any).length > 0);
    } catch (_) {
      return false;
    }
  }
}
