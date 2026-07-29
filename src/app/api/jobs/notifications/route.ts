import { NextResponse } from 'next/server'
import { processNotificationOutboxQueue } from '@/features/notifications/dispatcher'

/**
 * Endpoint de acionamento do Worker assíncrono de Mensageria.
 * Pode ser chamado por um CRON Job externo a cada N minutos.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    // Trava simples em ambiente de produção
    if (secret !== process.env.CRON_SECRET && process.env.NODE_ENV === 'production') {
      return new NextResponse('Unauthorized Access', { status: 401 });
    }

    // Invoca o orquestrador do Outbox (trata o SKIP LOCKED internamente)
    const result = await processNotificationOutboxQueue();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      ...result
    });

  } catch (error: any) {
    console.error('[API Notification Worker Crash]:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
