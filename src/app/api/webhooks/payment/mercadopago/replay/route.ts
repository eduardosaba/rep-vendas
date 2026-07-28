import { inngest } from '@/inngest/client';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// simples hash de proteção interna (pode evoluir pra JWT admin depois)
function verifyReplayToken(token?: string) {
  return token === process.env.INTERNAL_REPLAY_SECRET;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { log_id, external_id, simulated_status, replay_token } = body;

    // 🔐 1. SEGURANÇA: gate interno obrigatório
    if (!verifyReplayToken(replay_token)) {
      return NextResponse.json(
        { error: 'Unauthorized replay attempt' },
        { status: 401 }
      );
    }

    if (!log_id || !external_id) {
      return NextResponse.json(
        { error: 'Missing parameters' },
        { status: 400 }
      );
    }

    // 🔁 2. IDEMPOTÊNCIA DO REPLAY (anti double click / retry loop)
    const replayId = crypto
      .createHash('sha256')
      .update(`${log_id}:${external_id}`)
      .digest('hex');

    const { data: existingReplay } = await supabaseAdmin
      .from('payment_replay_log')
      .select('id')
      .eq('replay_id', replayId)
      .maybeSingle();

    if (existingReplay) {
      return NextResponse.json({
        success: true,
        message: 'Replay already executed',
        replay_id: replayId,
      });
    }

    // 📌 3. REGISTRA O REPLAY (audit trail obrigatório)
    await supabaseAdmin.from('payment_replay_log').insert({
      replay_id: replayId,
      log_id,
      external_id,
      simulated_status: simulated_status || null,
      created_at: new Date().toISOString(),
    });

    // 🧪 4. SANDBOX OVERRIDE (opcional, mas rastreado)
    if (simulated_status) {
      await supabaseAdmin
        .from('payment_webhook_logs')
        .update({
          payload_override: {
            simulated_status,
            original_external_id: external_id,
          },
        })
        .eq('id', log_id);
    }

    // 🚀 5. REINJEÇÃO NO INNGEST (sem mutação do sistema real)
    await inngest.send({
      name: 'payment/mercadopago.received',
      data: {
        log_id,
        external_id: String(external_id),
        is_replay: true,
        replay_id: replayId,
      },
    });

    return NextResponse.json({
      success: true,
      replay_id: replayId,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
