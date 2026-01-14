import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import * as XLSX from 'xlsx';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const userId = url.searchParams.get('userId');
    if (!userId) {
      return NextResponse.json(
        { error: 'userId is required' },
        { status: 400 }
      );
    }

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('products')
      .select(
        'id,name,reference_code,price,sale_price,brand,category,stock_quantity,updated_at'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error)
      return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = (data || []).map((r: any) => ({
      id: r.id,
      name: r.name,
      reference_code: r.reference_code,
      price: r.price,
      sale_price: r.sale_price,
      brand: r.brand,
      category: r.category,
      stock_quantity: r.stock_quantity,
      updated_at: r.updated_at,
    }));

    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Produtos');

    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const filename = `products-${userId}.xlsx`;

    return new NextResponse(Buffer.from(buf), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || String(err) },
      { status: 500 }
    );
  }
}
