import { NextResponse } from 'next/server';

// Endpoint simples para receber o payload do Edge Function e encaminhar
// para o provedor de WhatsApp ou outro sistema de automação.

const PROVIDER_URL = process.env.WHATSAPP_API_URL;
const PROVIDER_TOKEN = process.env.WHATSAPP_API_KEY;
const LOCAL_VALIDATE_TOKEN = process.env.LEAD_WEBHOOK_TOKEN; // token para validar quem chama

function normalizePhone(raw: string | undefined) {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  // Se já começa com 55 assume BR, senão retorna como está (caller deve garantir E.164 sem '+')
  if (digits.startsWith('55')) return digits;

  // Se tem 10 ou 11 dígitos, assume número local BR e adiciona country code 55
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;

  return digits; // devolve como recebido caso seja internacional
}

export async function POST(req: Request) {
  try {
    // Validação simples de token no header
    const auth = req.headers.get('authorization') || '';
    if (LOCAL_VALIDATE_TOKEN && auth !== `Bearer ${LOCAL_VALIDATE_TOKEN}`) {
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Aceita payloads vindo tanto do webhook.site quanto do Edge Function
    const record = body.record || body.new || body;

    const name = record?.name || record?.data?.name || 'Cliente';
    const rawPhone = record?.whatsapp || record?.data?.whatsapp || record?.to;

    const to = normalizePhone(rawPhone);

    if (!to) {
      return NextResponse.json({ error: 'invalid_phone' }, { status: 400 });
    }

    const text = `Olá ${name}! Vi que você acessou nossa demo do Rep-Vendas. Quer ajuda para importar seus produtos?`;

    // Encaminha para o provedor configurado
    if (!PROVIDER_URL) {
      // apenas log para desenvolvimento
      console.log('Lead received:', { name, to, text });
      return NextResponse.json({ ok: true, debug: true });
    }

    const resp = await fetch(PROVIDER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(PROVIDER_TOKEN ? { Authorization: `Bearer ${PROVIDER_TOKEN}` } : {}),
      },
      body: JSON.stringify({ to, name, text }),
    });

    if (!resp.ok) {
      const textResp = await resp.text().catch(() => 'no-body');
      console.error('provider error', resp.status, textResp);
      return NextResponse.json({ error: 'provider_error', status: resp.status }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('lead-webhook error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
