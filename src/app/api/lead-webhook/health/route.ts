import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    env: {
      LEAD_WEBHOOK_TOKEN: !!process.env.LEAD_WEBHOOK_TOKEN,
      WHATSAPP_API_URL: !!process.env.WHATSAPP_API_URL,
      WHATSAPP_API_KEY: !!process.env.WHATSAPP_API_KEY,
    },
  });
}
