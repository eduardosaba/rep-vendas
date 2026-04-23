import { NextResponse } from 'next/server';
import { createRouteSupabase } from '@/lib/supabase/server';

export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not allowed in production' }, { status: 403 });
  }

  try {
    const supabase = await createRouteSupabase();

    const sql = `
    INSERT INTO public.role_permissions (role, company_id, allowed_tabs, allowed_sidebar_labels, can_manage_catalog)
    VALUES
    ('master', NULL, '{geral,appearance,display,institucional,pages,estoque,perfil}', '{Visão Geral,Pedidos,Distribuidora,Gestão da Distribuidora,Produtos,Marketing,Ferramentas,Clientes,Equipe,Comunicados,Configurações,Ajuda}', true),
    ('admin_company', NULL, '{geral,appearance,display,institucional,pages,estoque,perfil}', '{Visão Geral,Pedidos,Distribuidora,Gestão da Distribuidora,Produtos,Marketing,Clientes,Equipe,Comunicados,Configurações,Ajuda}', true),
    ('rep', NULL, '{geral,appearance,display,estoque,perfil}', '{Visão Geral,Pedidos,Produtos,Marketing,Clientes,Configurações,Ajuda}', true),
    ('representative', NULL, '{geral,perfil}', '{Visão Geral,Pedidos,Distribuidora,Clientes,Configurações,Ajuda}', false)
    ON CONFLICT (role, company_id) DO UPDATE SET
      allowed_tabs = EXCLUDED.allowed_tabs,
      allowed_sidebar_labels = EXCLUDED.allowed_sidebar_labels,
      can_manage_catalog = EXCLUDED.can_manage_catalog;
    `;

    let rpcError: any = null;
    try {
      // Attempt raw SQL execution via RPC if available
      const rpcRes: any = await (supabase as any).rpc?.('sql', { q: sql });
      if (rpcRes?.error) rpcError = rpcRes.error;
    } catch (e) {
      rpcError = e;
    }

    // Some Supabase client builds don't expose rpc(sql) helper; fallback to query
    if (rpcError) {
      // Try using from().insert with upsert
      const rows = [
        { role: 'master', company_id: null, allowed_tabs: ['geral','appearance','display','institucional','pages','estoque','perfil'], allowed_sidebar_labels: ['Visão Geral','Pedidos','Distribuidora','Gestão da Distribuidora','Produtos','Marketing','Ferramentas','Clientes','Equipe','Comunicados','Configurações','Ajuda'], can_manage_catalog: true },
        { role: 'admin_company', company_id: null, allowed_tabs: ['geral','appearance','display','institucional','pages','estoque','perfil'], allowed_sidebar_labels: ['Visão Geral','Pedidos','Distribuidora','Gestão da Distribuidora','Produtos','Marketing','Clientes','Equipe','Comunicados','Configurações','Ajuda'], can_manage_catalog: true },
        { role: 'rep', company_id: null, allowed_tabs: ['geral','appearance','display','estoque','perfil'], allowed_sidebar_labels: ['Visão Geral','Pedidos','Produtos','Marketing','Clientes','Configurações','Ajuda'], can_manage_catalog: true },
        { role: 'representative', company_id: null, allowed_tabs: ['geral','perfil'], allowed_sidebar_labels: ['Visão Geral','Pedidos','Distribuidora','Clientes','Configurações','Ajuda'], can_manage_catalog: false },
      ];
      const { error: upsertErr } = await supabase.from('role_permissions').upsert(rows);
      if (upsertErr) return NextResponse.json({ error: upsertErr.message || String(upsertErr) }, { status: 500 });
      return NextResponse.json({ success: true, method: 'upsert' });
    }

    return NextResponse.json({ success: true, method: 'sql' });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || String(err) }, { status: 500 });
  }
}

export const runtime = 'edge';
