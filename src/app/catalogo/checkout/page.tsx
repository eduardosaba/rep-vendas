'use server';

import React from 'react';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import CheckoutForm from './CheckoutForm.client';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function Page({ searchParams }: { searchParams: { company?: string; rep?: string; venda?: string; product?: string } }) {
  const { company, rep, venda, product } = searchParams || {};

  let companyData: any = null;
  let themeSettings: any = null;
  let productData: any = null;
  let resolvedRep: any = null;
  let checkoutBlocked = false;

  if (venda) {
    const { data } = await supabaseAdmin
      .from('profiles')
      .select('id, full_name, email, company_id, slug')
      .eq('slug', venda)
      .maybeSingle();
    resolvedRep = data || null;
  }

  const effectiveCompanyId = company || resolvedRep?.company_id;

  if (company) {
    let data: any = null;
    try {
      const res = await supabaseAdmin
        .from('companies')
        .select('id,name,logo_url,block_new_orders')
        .eq('id', company)
        .maybeSingle();
      data = res.data;
    } catch {
      const res = await supabaseAdmin
        .from('companies')
        .select('id,name,logo_url')
        .eq('id', company)
        .maybeSingle();
      data = res.data;
    }
    companyData = data || null;
    checkoutBlocked = Boolean((data as any)?.block_new_orders);
  }

  if (!companyData && effectiveCompanyId) {
    try {
      const { data } = await supabaseAdmin
        .from('companies')
        .select('id,name,logo_url,block_new_orders')
        .eq('id', effectiveCompanyId)
        .maybeSingle();
      companyData = data || null;
      checkoutBlocked = Boolean((data as any)?.block_new_orders);
    } catch {
      // fallback: segue sem bloqueio se a coluna ainda nao existir
    }
  }

  if (effectiveCompanyId) {
    const { data: settings } = await supabaseAdmin
      .from('company_settings')
      .select('primary_color,secondary_color,accent_color,font_family,border_radius')
      .eq('company_id', effectiveCompanyId)
      .maybeSingle();
    themeSettings = settings || null;
  }

  if (product) {
    const { data } = await supabaseAdmin
      .from('products')
      .select('id,name,brand,price,image_url,external_image_url')
      .eq('id', product)
      .maybeSingle();
    productData = data || null;
  }

  return (
    <div className="p-6">
      <h1 className="text-2xl font-semibold mb-4">Checkout</h1>
      {companyData ? <div className="mb-4">Pedido para: <strong>{companyData.name}</strong></div> : null}
      <CheckoutForm
        companyId={effectiveCompanyId}
        repId={rep}
        repSlug={venda}
        productId={product}
        initialTheme={themeSettings}
        initialProduct={productData}
        initialRep={resolvedRep}
        checkoutBlocked={checkoutBlocked}
      />
    </div>
  );
}
