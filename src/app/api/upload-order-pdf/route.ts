import { NextResponse } from 'next/server';
import createClient from '@/lib/supabase/server';

export async function POST(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get('orderId');
    if (!orderId) {
      return NextResponse.json(
        { success: false, error: 'orderId is required' },
        { status: 400 }
      );
    }

    const arrayBuffer = await request.arrayBuffer();

    const supabase = await createClient();

    const bucket = 'orders';
    const filePath = `${orderId}.pdf`;

    // Upload — supabase/storage expects Buffer in Node
    const buffer = Buffer.from(arrayBuffer);
    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, buffer, { upsert: true });
    if (uploadError) {
      console.error('Upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: uploadError.message || String(uploadError) },
        { status: 500 }
      );
    }

    const { data } = supabase.storage.from(bucket).getPublicUrl(filePath);
    const publicUrl = data?.publicUrl || null;

    // Atualizar ordem com link do PDF (campo `pdf_url` deve existir)
    const { error: updateError } = await supabase
      .from('orders')
      .update({ pdf_url: publicUrl })
      .eq('id', orderId);
    if (updateError) {
      console.error('Erro ao atualizar order com pdf_url:', updateError);
      return NextResponse.json(
        { success: false, error: updateError.message || String(updateError) },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true, publicUrl });
  } catch (err) {
    console.error('Unhandled error in upload-order-pdf:', err);
    return NextResponse.json(
      { success: false, error: (err as Error).message },
      { status: 500 }
    );
  }
}
