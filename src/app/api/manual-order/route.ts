import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: any) {
  try {
    const body = await req.json();
    const { customer, items } = body;

    const ensureSupabaseEnv = () => {
      if (
        !process.env.NEXT_PUBLIC_SUPABASE_URL ||
        !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ) {
        console.error(
          'Faltam variáveis de ambiente Supabase: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY'
        );
        throw new Error(
          'Configuração inválida: verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY'
        );
      }
    };

    ensureSupabaseEnv();
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user)
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

    // Attempt sequential display_id generation with retry on conflict.
    const maxAttempts = 5;
    let orderData: any = null;
    let lastErr: any = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      // get current max display_id for this user
      const { data: lastRow } = await supabase
        .from('orders')
        .select('display_id')
        .eq('user_id', user.id)
        .order('display_id', { ascending: false })
        .limit(1)
        .maybeSingle();

      const nextDisplayId =
        lastRow && lastRow.display_id
          ? Number(lastRow.display_id) + 1
          : Math.floor(Date.now() / 1000);

      const orderPayload: any = {
        user_id: user.id,
        display_id: nextDisplayId,
        client_name_guest: customer.name,
        client_email_guest: customer.email,
        client_phone_guest: customer.phone,
        client_document_guest: customer.document,
        status: 'Pendente',
        total_value: items.reduce(
          (acc: number, it: any) =>
            acc + (Number(it.unit_price) * Number(it.quantity) || 0),
          0
        ),
        item_count: items.length,
      };

      const { data, error } = await supabase
        .from('orders')
        .insert(orderPayload)
        .select()
        .maybeSingle();
      if (!error && data) {
        orderData = data;
        break;
      }

      lastErr = error;

      // if conflict, wait shortly and retry
      if (error && (error.message || '').toLowerCase().includes('duplicate')) {
        // small backoff
        await new Promise((r) => setTimeout(r, 80 * (attempt + 1)));
        continue;
      }

      // other error -> fail fast
      return NextResponse.json(
        { error: error?.message || 'Erro ao criar pedido' },
        { status: 500 }
      );
    }

    if (!orderData) {
      return NextResponse.json(
        { error: lastErr?.message || 'Não foi possível gerar display_id' },
        { status: 500 }
      );
    }

    // insert items
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const itemsPayload = items.map((it: any) => ({
      order_id: orderData.id,
      product_name: it.product_name,
      product_reference: it.product_reference,
      quantity: it.quantity,
      unit_price: it.unit_price,
      total_price: Number(it.unit_price) * Number(it.quantity),
    }));

    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(itemsPayload);
    if (itemsError)
      return NextResponse.json({ error: itemsError.message }, { status: 500 });

    return NextResponse.json({
      success: true,
      id: orderData.id,
      display_id: orderData.display_id,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: (err as any)?.message || String(err) },
      { status: 500 }
    );
  }
}
