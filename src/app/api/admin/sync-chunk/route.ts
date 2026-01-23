import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { inngest } from '@/inngest/client';

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user)
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const chunkSize = Number(body?.chunkSize || 20);
  const jobId = body?.jobId || null;

  await inngest.send({
    name: 'catalog/sync.chunk.requested',
    data: {
      userId: user.id,
      chunkSize,
      jobId,
    },
  });

  return NextResponse.json({
    success: true,
    message: 'Chunk requested',
    chunkSize,
    jobId,
  });
}
