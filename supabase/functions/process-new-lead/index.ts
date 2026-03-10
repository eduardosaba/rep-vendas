// @ts-ignore - Deno runtime for Supabase Functions; ignore in Node typecheck
// @ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// Provide a loose declaration so `tsc` in node environment doesn't error
declare const Deno: any;

const WHATSAPP_API_URL = Deno?.env?.get("WHATSAPP_API_URL") || "";
const WHATSAPP_API_KEY = Deno?.env?.get("WHATSAPP_API_KEY") || "";

serve(async (req: Request) => {
  try {
    const payload = await req.json();
    // Supabase Database Webhook envia { "record": { ... } }
    const record = payload.record || payload.new || payload;

    const name = record?.name || 'Contato';
    const whatsapp = record?.whatsapp;

    console.log('process-new-lead - recebido', { name, whatsapp });

    if (WHATSAPP_API_URL) {
      // Envia payload simplificado ideal para Zapier / n8n
      const payload: Record<string, any> = {
        nome: name,
        telefone: whatsapp || null,
        email: record?.email || null,
        origem: 'Rep-Vendas Demo',
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (WHATSAPP_API_KEY) headers['Authorization'] = `Bearer ${WHATSAPP_API_KEY}`;

      await fetch(WHATSAPP_API_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('process-new-lead - erro', error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});
