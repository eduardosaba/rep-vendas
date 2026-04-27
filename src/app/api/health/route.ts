import { NextResponse } from 'next/server';
import { createClient as createSupabase } from '@supabase/supabase-js';

export async function GET() {
  try {
    const supabase = createSupabase(
      String(process.env.NEXT_PUBLIC_SUPABASE_URL || ''),
      String(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
    );

    // Query super leve que não deve tocar dados reais
    const { error } = await supabase.from('_non_existent_table_').select('id').limit(1);

    // Se houver erro de rede/conn, supomos que o DB está down
    if (error && /fetch failed|connect|timeout|ECONNRESET/i.test(String(error.message || ''))) {
      return NextResponse.json({ status: 'down', error: error.message || null }, { status: 503 });
    }

    return NextResponse.json({ status: 'up' }, { status: 200 });
  } catch (err: any) {
    return NextResponse.json({ status: 'down', error: String(err?.message || err) }, { status: 503 });
  }
}
