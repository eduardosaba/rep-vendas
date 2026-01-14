import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

function escapeCsv(val: any) {
  if (val === null || val === undefined) return '';
  const s = String(val);
  if (s.includes('"') || s.includes(',') || s.includes('\n'))
    return `"${s.replace(/"/g, '""')}"`;
  return s;
}

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

    const rows = data || [];
    const headers = [
      'id',
      'name',
      'reference_code',
      'price',
      'sale_price',
      'brand',
      'category',
      'stock_quantity',
      'updated_at',
    ];
    const csv = [headers.join(',')]
      .concat(
        rows.map((r: any) =>
          headers.map((h) => escapeCsv((r as any)[h])).join(',')
        )
      )
      .join('\n');

    const filename = `products-${userId}.csv`;
    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
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
