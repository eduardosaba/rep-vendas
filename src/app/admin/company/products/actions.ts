'use server';

import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export async function getCompanyProducts() {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .maybeSingle();
    const companyId = (profile as any)?.company_id;
    if (!companyId) return { success: true, data: [] };

    const { data, error } = await supabaseAdmin
      .from('products')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function createCompanyProduct(payload: any) {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .maybeSingle();
    const companyId = (profile as any)?.company_id;
    if (!companyId) return { success: false, error: 'User not linked to a company' };

    const insertPayload = {
      ...payload,
      company_id: companyId,
      user_id: userId,
    };

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert(insertPayload)
      .select()
      .maybeSingle();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function updateCompanyProduct(productId: string, payload: any) {
  try {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .maybeSingle();
    const companyId = (profile as any)?.company_id;
    if (!companyId) return { success: false, error: 'User not linked to a company' };

    // ensure product belongs to company
    const { data: existing } = await supabaseAdmin.from('products').select('id,company_id').eq('id', productId).maybeSingle();
    if (!existing || existing.company_id !== companyId) return { success: false, error: 'Product not found or permission denied' };

    const { data, error } = await supabaseAdmin
      .from('products')
      .update(payload)
      .eq('id', productId)
      .select()
      .maybeSingle();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

export async function deleteCompanyProduct(productId: string) {
  try {
    const { error } = await supabaseAdmin
      .from('products')
      .delete()
      .eq('id', productId);
    if (error) throw error;
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || String(err) };
  }
}

// Server Actions compatible with Form action handlers
export async function createProductFromForm(formData: FormData) {
  'use server';
  const payload: any = {};
  for (const [key, value] of formData.entries()) {
    payload[key] = value;
  }
  // normalize fields
  if (payload.price) payload.price = Number(payload.price);
  if (payload.stock_quantity) payload.stock_quantity = Number(payload.stock_quantity);
  payload.manage_stock = payload.manage_stock === 'on' || payload.manage_stock === true || payload.manage_stock === 'true';

  // handle image upload if present
  const image = formData.get('image') as File | null;
  if (image && (image as any).size > 0) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .maybeSingle();
    const companyId = (profile as any)?.company_id;
    if (!companyId) return { success: false, error: 'User not linked to a company' };

    const arrayBuffer = await image.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    const filename = `${companyId}/${Date.now()}_${(image as any).name}`;
    const bucket = 'product-images';
    const { error: uploadErr } = await supabaseAdmin.storage.from(bucket).upload(filename, buf, { upsert: false });
    if (uploadErr) return { success: false, error: uploadErr.message };
    const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(filename);
    payload.image_url = publicData.publicUrl;
  }

  return await createCompanyProduct(payload);
}

export async function deleteProductFromForm(formData: FormData) {
  'use server';
  const id = String(formData.get('id'));
  return await deleteCompanyProduct(id);
}

export async function updateProductFromForm(formData: FormData) {
  'use server';
  const id = String(formData.get('id'));
  const payload: any = {};
  for (const [key, value] of formData.entries()) {
    if (key === 'id') continue;
    payload[key] = value;
  }
  if (payload.price) payload.price = Number(payload.price);
  if (payload.stock_quantity) payload.stock_quantity = Number(payload.stock_quantity);
  payload.manage_stock = payload.manage_stock === 'on' || payload.manage_stock === true || payload.manage_stock === 'true';

  const image = formData.get('image') as File | null;
  if (image && (image as any).size > 0) {
    const supabase = await createClient();
    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) return { success: false, error: 'Not authenticated' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', userId)
      .maybeSingle();
    const companyId = (profile as any)?.company_id;
    if (!companyId) return { success: false, error: 'User not linked to a company' };

    const arrayBuffer = await image.arrayBuffer();
    const buf = Buffer.from(arrayBuffer);
    const filename = `${companyId}/${Date.now()}_${(image as any).name}`;
    const bucket = 'product-images';
    const { error: uploadErr } = await supabaseAdmin.storage.from(bucket).upload(filename, buf, { upsert: false });
    if (uploadErr) return { success: false, error: uploadErr.message };
    const { data: publicData } = supabaseAdmin.storage.from(bucket).getPublicUrl(filename);
    payload.image_url = publicData.publicUrl;
  }

  return await updateCompanyProduct(id, payload);
}
