import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inngest } from '@/inngest/client';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { sourcePath, productId } = body || {};
    if (!sourcePath || !productId) {
      return NextResponse.json(
        { error: 'sourcePath and productId are required' },
        { status: 400 }
      );
    }

    // Enfileira evento para o Inngest processar copy-on-write
    await inngest.send({
      name: 'image/copy_on_write.requested',
      data: {
        sourcePath,
        targetUserId: user.id,
        productId,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('copy-on-write route error', err);
    return NextResponse.json(
      { error: String(err?.message || err) },
      { status: 500 }
    );
  }
}
