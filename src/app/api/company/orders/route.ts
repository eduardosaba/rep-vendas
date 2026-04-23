import { NextResponse } from 'next/server';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import {
  generateSeparationPdf,
  markOrderFaturado,
} from '@/app/admin/distribuidora/pedidos/actions';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

type ProfileRow = {
  id: string;
  role: string | null;
  company_id: string | null;
};

function isMissingColumnError(error: any) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return code === '42703' || (message.includes('column') && message.includes('does not exist'));
}

async function getRequesterProfile() {
  const supabase = await createClient();
  const authRes = await supabase.auth.getUser();
  const user = authRes?.data?.user;
  if (!user) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      ),
    };
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id,role,company_id')
    .eq('id', user.id)
    .maybeSingle<ProfileRow>();

  if (error || !profile) {
    return {
      error: NextResponse.json(
        { success: false, error: error?.message || 'Profile not found' },
        { status: 403 }
      ),
    };
  }

  if (!profile.company_id) {
    return {
      error: NextResponse.json(
        { success: false, error: 'No company linked' },
        { status: 400 }
      ),
    };
  }

  const role = String(profile.role || '');
  const isCompanyAdmin =
    role === 'admin_company' ||
    role === 'master' ||
    ((role === 'representative' || role === 'rep') && Boolean(profile.company_id));
  if (!isCompanyAdmin) {
    return {
      error: NextResponse.json(
        { success: false, error: 'Forbidden' },
        { status: 403 }
      ),
    };
  }

  return { user, profile };
}

export async function GET(req: Request) {
  try {
    const requester = await getRequesterProfile();
    if ('error' in requester) return requester.error;
    const { profile } = requester;

    const { searchParams } = new URL(req.url);
    const orderId = String(searchParams.get('orderId') || '').trim();

    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'orderId é obrigatório' },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select(
        'id,display_id,status,total_value,created_at,client_name_guest,client_cnpj_guest,customer_id,seller_id,company_id,pdf_url,faturado_at,despachado_at,tracking_code,notes'
      )
      .eq('id', orderId)
      .eq('company_id', profile.company_id)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: orderError?.message || 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    let items: any[] = [];
    const itemsSelect =
      'id,product_name,quantity,total_price,product_id,products(brand,image_url,external_image_url)';

    const orderedItemsRes = await supabaseAdmin
      .from('order_items')
      .select(itemsSelect)
      .eq('order_id', orderId)
      .order('created_at', { ascending: true });

    if (!orderedItemsRes.error) {
      items = orderedItemsRes.data || [];
    } else if (isMissingColumnError(orderedItemsRes.error)) {
      const fallbackItemsRes = await supabaseAdmin
        .from('order_items')
        .select(itemsSelect)
        .eq('order_id', orderId);

      if (fallbackItemsRes.error) {
        return NextResponse.json(
          { success: false, error: fallbackItemsRes.error.message },
          { status: 500 }
        );
      }

      items = fallbackItemsRes.data || [];
    } else {
      return NextResponse.json(
        { success: false, error: orderedItemsRes.error.message },
        { status: 500 }
      );
    }

    let sellerName: string | null = null;
    let commissionRate = 0;
    if ((order as any).seller_id) {
      const { data: seller } = await supabaseAdmin
        .from('profiles')
        .select('full_name,commission_rate')
        .eq('id', (order as any).seller_id)
        .maybeSingle();
      sellerName = (seller as any)?.full_name || null;
      commissionRate = Number((seller as any)?.commission_rate || 0);
    }

    let commissionValue = 0;
    const { data: commission } = await supabaseAdmin
      .from('commissions')
      .select('amount')
      .eq('order_id', orderId)
      .maybeSingle();
    if (commission && (commission as any).amount != null) {
      commissionValue = Number((commission as any).amount || 0);
    } else {
      commissionValue =
        (Number((order as any).total_value || 0) * Number(commissionRate || 0)) /
        100;
    }

    let customerName = (order as any).client_name_guest || null;
    let customerCnpj = (order as any).client_cnpj_guest || null;
    let customerCity: string | null = null;
    if ((order as any).customer_id) {
      const { data: customer } = await supabaseAdmin
        .from('customers')
        .select('name,document,address')
        .eq('id', (order as any).customer_id)
        .maybeSingle();
      if (customer) {
        customerName = (customer as any).name || customerName;
        customerCnpj = (customer as any).document || customerCnpj;
        const addr = (customer as any).address;
        if (addr && typeof addr === 'object') {
          customerCity = (addr as any).city || null;
        }
      }
    }

    const signatureMatch = String((order as any).notes || '').match(
      /Assinatura:\s*(https?:\/\/\S+)/i
    );
    const signatureUrl = signatureMatch?.[1] || null;

    const normalizedItems = (items || []).map((item: any) => ({
      id: item.id,
      name: item.product_name,
      brand: item?.products?.brand || null,
      quantity: Number(item.quantity || 0),
      total_price: Number(item.total_price || 0),
      image_url:
        item?.products?.image_url || item?.products?.external_image_url || null,
    }));

    let trackingHistory: Array<{
      id: string;
      tracking_code: string | null;
      status_note: string | null;
      created_at: string;
    }> = [];
    try {
      const { data } = await supabaseAdmin
        .from('order_tracking_history')
        .select('id,tracking_code,status_note,created_at')
        .eq('order_id', orderId)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });
      trackingHistory = (data || []) as any;
    } catch {
      trackingHistory = [];
    }

    return NextResponse.json({
      success: true,
      data: {
        id: (order as any).id,
        display_id: (order as any).display_id,
        status: (order as any).status,
        customer_name: customerName,
        customer_cnpj: customerCnpj,
        customer_city: customerCity,
        seller_name: sellerName,
        commission_value: commissionValue,
        total_value: Number((order as any).total_value || 0),
        tracking_code: (order as any).tracking_code || null,
        pdf_url: (order as any).pdf_url || null,
        signature_url: signatureUrl,
        tracking_history: trackingHistory,
        items: normalizedItems,
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const requester = await getRequesterProfile();
    if ('error' in requester) return requester.error;
    const { profile } = requester;

    const body = await req.json();
    const orderId = String(body?.orderId || '').trim();
    const action = String(body?.action || '').trim();
    const trackingCode =
      body?.trackingCode == null ? null : String(body.trackingCode || '').trim();

    if (!orderId || !action) {
      return NextResponse.json(
        { success: false, error: 'orderId e action são obrigatórios' },
        { status: 400 }
      );
    }

    const { data: order, error: orderError } = await supabaseAdmin
      .from('orders')
      .select('id,company_id')
      .eq('id', orderId)
      .eq('company_id', profile.company_id)
      .maybeSingle();

    if (orderError || !order) {
      return NextResponse.json(
        { success: false, error: orderError?.message || 'Pedido não encontrado' },
        { status: 404 }
      );
    }

    if (action === 'faturado') {
      const result = await markOrderFaturado(orderId);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || 'Falha ao faturar pedido' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, data: { status: 'Confirmado' } });
    }

    if (action === 'despachado') {
      const nowIso = new Date().toISOString();

      // Tenta persistir tracking_code quando a coluna existir.
      const withTracking = await supabaseAdmin
        .from('orders')
        .update({
          status: 'Enviado',
          despachado_at: nowIso,
          tracking_code: trackingCode || null,
        })
        .eq('id', orderId)
        .eq('company_id', profile.company_id);

      if (withTracking.error) {
        const fallback = await supabaseAdmin
          .from('orders')
          .update({
            status: 'Enviado',
            despachado_at: nowIso,
          })
          .eq('id', orderId)
          .eq('company_id', profile.company_id);
        if (fallback.error) {
          return NextResponse.json(
            { success: false, error: fallback.error.message },
            { status: 500 }
          );
        }
      }

      try {
        await supabaseAdmin.from('order_tracking_history').insert({
          order_id: orderId,
          company_id: profile.company_id,
          tracking_code: trackingCode || null,
          status_note: 'Pedido marcado como despachado',
          created_by: requester.user.id,
        });
      } catch {
        // histórico opcional para manter retrocompatibilidade
      }

      return NextResponse.json({ success: true, data: { status: 'Enviado' } });
    }

    if (action === 'update_tracking') {
      const nowIso = new Date().toISOString();

      const withTracking = await supabaseAdmin
        .from('orders')
        .update({ tracking_code: trackingCode || null })
        .eq('id', orderId)
        .eq('company_id', profile.company_id);

      if (withTracking.error) {
        return NextResponse.json(
          { success: false, error: withTracking.error.message },
          { status: 500 }
        );
      }

      try {
        await supabaseAdmin.from('order_tracking_history').insert({
          order_id: orderId,
          company_id: profile.company_id,
          tracking_code: trackingCode || null,
          status_note: 'Código de rastreio atualizado',
          created_by: requester.user.id,
          created_at: nowIso,
        });
      } catch {
        // histórico opcional
      }

      return NextResponse.json({ success: true, data: { tracking_code: trackingCode || null } });
    }

    if (action === 'generate_pdf') {
      const result = await generateSeparationPdf(orderId);
      if (!result.success) {
        return NextResponse.json(
          { success: false, error: result.error || 'Falha ao gerar PDF' },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, data: { url: result.url || null } });
    }

    return NextResponse.json(
      { success: false, error: 'Ação inválida' },
      { status: 400 }
    );
  } catch (e: any) {
    return NextResponse.json(
      { success: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
