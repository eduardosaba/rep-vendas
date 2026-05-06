// Supabase Edge Function (Deno) — send-order-notification (HTTP v1 using OAuth2 JWT)
// Expects a POST with JSON body containing the new order row (new or record).

import { serve } from 'std/server';
import { create, getNumericDate, importPKCS8 } from 'https://deno.land/x/djwt@v2.8/mod.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || Deno.env.get('NEXT_PUBLIC_SUPABASE_URL') || '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY') || '';

const FIREBASE_CLIENT_EMAIL = Deno.env.get('FIREBASE_CLIENT_EMAIL') || Deno.env.get('GOOGLE_CLIENT_EMAIL') || '';
const FIREBASE_PRIVATE_KEY_RAW = Deno.env.get('FIREBASE_PRIVATE_KEY') || Deno.env.get('GOOGLE_PRIVATE_KEY') || '';
const FIREBASE_PROJECT_ID = Deno.env.get('FIREBASE_PROJECT_ID') || Deno.env.get('NEXT_PUBLIC_FIREBASE_PROJECT_ID') || '';

async function getAccessToken() {
  if (!FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY_RAW) throw new Error('Firebase service account missing');

  const privateKey = FIREBASE_PRIVATE_KEY_RAW.replace(/\\n/g, '\n').trim();
  const key = await importPKCS8(privateKey, 'RS256');

  const iat = getNumericDate(0);
  const exp = getNumericDate(60 * 60); // 1 hour

  const payload = {
    iss: FIREBASE_CLIENT_EMAIL,
    scope: 'https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    exp,
    iat,
  } as any;

  const jwt = await create({ alg: 'RS256', typ: 'JWT' }, payload, key);

  const params = new URLSearchParams();
  params.set('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
  params.set('assertion', jwt);

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`token exchange failed: ${res.status} ${txt}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

serve(async (req) => {
  try {
    // Validate webhook secret header if configured
    const incomingSecret = req.headers.get('x-project-secret') || req.headers.get('x-project-token');
    const configuredSecret = Deno.env.get('PROJECT_WEBHOOK_SECRET') || '';
    if (configuredSecret) {
      if (!incomingSecret || incomingSecret !== configuredSecret) {
        console.warn('Invalid or missing webhook secret');
        return new Response('Unauthorized', { status: 401 });
      }
    }
    if (req.method === 'OPTIONS') return new Response('ok', { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, apikey, content-type' } });
    if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

    const body = await req.json();
    // Support both direct order payloads and outbox webhook rows
    let newOrder = body?.new ?? body?.record ?? body;
    // If this is a webhook_events outbox row, payload contains the actual order
    let webhookEventId: string | null = null;
    if (newOrder && newOrder.event_type && newOrder.payload) {
      if (newOrder.event_type !== 'order.created') {
        return new Response('Ignored event type', { status: 200 });
      }
      webhookEventId = newOrder.id || null;
      try {
        newOrder = typeof newOrder.payload === 'string' ? JSON.parse(newOrder.payload) : newOrder.payload;
      } catch (e) {
        newOrder = newOrder.payload;
      }
    }
    if (!newOrder) return new Response('No order data', { status: 400 });

    const vendedorId = newOrder.vendedor_id || newOrder.user_id || newOrder.owner_id;
    if (!vendedorId) return new Response('Missing vendedor_id', { status: 400 });

    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error('Missing Supabase env vars');
      return new Response('Server misconfigured', { status: 500 });
    }
    if (!FIREBASE_PROJECT_ID) {
      console.error('Missing FIREBASE_PROJECT_ID');
      return new Response('FCM not configured', { status: 500 });
    }

    // Fetch full order details (items, customer) using the service role key
    const orderRes = await fetch(`${SUPABASE_URL}/rest/v1/orders?id=eq.${encodeURIComponent(newOrder.id)}&select=*,order_items(*,product_id(*)),customer_id(*)`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Accept: 'application/json',
      },
    });

    let orderFull: any = null;
    if (orderRes.ok) {
      const arr = await orderRes.json();
      orderFull = Array.isArray(arr) ? arr[0] : arr;
    }

    // Fetch tokens for the vendor via Supabase REST
    const tokensRes = await fetch(`${SUPABASE_URL}/rest/v1/user_fcm_tokens?select=token&user_id=eq.${encodeURIComponent(vendedorId)}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Accept: 'application/json',
      },
    });

    if (!tokensRes.ok) {
      console.error('Failed to fetch tokens', await tokensRes.text());
      return new Response('Failed to fetch tokens', { status: 502 });
    }

    const tokensJson = await tokensRes.json();
    const tokens = Array.isArray(tokensJson) ? tokensJson.map((r: any) => r.token).filter(Boolean) : [];
    if (!tokens.length) return new Response(JSON.stringify({ message: 'No tokens' }), { status: 200, headers: { 'Content-Type': 'application/json' } });

    // Obtain OAuth2 access token via JWT exchange
    const accessToken = await getAccessToken();

    // Build rich payload from orderFull (fallbacks to newOrder)
    const clienteNome = orderFull?.customer?.name || newOrder.cliente_nome || 'cliente';
    const createdAt = orderFull?.created_at || newOrder.created_at || new Date().toISOString();
    const items = orderFull?.order_items || newOrder.items || [];
    const qtdProdutos = Array.isArray(items) ? items.reduce((s: number, it: any) => s + (it.quantity || 0), 0) : 0;
    const valorTotal = orderFull?.total_amount || newOrder.total || newOrder.valor_total || 0;

    const resumo = Array.isArray(items)
      ? items.slice(0, 3).map((it: any) => `${it.quantity || 1}x ${it.product_id?.name || it.name || 'item'}`).join(', ') + (items.length > 3 ? '...' : '')
      : '';

    const title = `🛍️ Novo pedido — R$ ${Number(valorTotal).toFixed(2)}`;
    const bodyText = `${clienteNome} — ${qtdProdutos} itens: ${resumo}`;

    // Send one request per token (FCM HTTP v1 expects a single token in message.token)
    const sendPromises = tokens.map((token: string) => {
      const payload: any = {
        message: {
          token,
          notification: { title, body: bodyText },
          data: {
            orderId: String(newOrder.id || ''),
            clienteNome: String(clienteNome),
            createdAt: String(createdAt),
            valorTotal: String(valorTotal),
            qtdProdutos: String(qtdProdutos),
          },
          android: {
            notification: {
              channel_id: Deno.env.get('FCM_ANDROID_CHANNEL') || 'repvendas_default',
              sound: 'default',
            },
            priority: 'high',
          },
          apns: {
            headers: { 'apns-priority': '10' },
            payload: { aps: { sound: 'default' } },
          },
        },
      };
      return fetch(`https://fcm.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/messages:send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
    });

    const results = await Promise.allSettled(sendPromises);
    const successCount = results.filter((r: any) => r.status === 'fulfilled' && r.value && r.value.ok).length;
    const failureCount = results.length - successCount;

    // If this was an outbox webhook row, mark it as processed
    if (webhookEventId && SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
      try {
        await fetch(`${SUPABASE_URL}/rest/v1/webhook_events?id=eq.${encodeURIComponent(webhookEventId)}`, {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            apikey: SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ processed: true, processed_at: new Date().toISOString() }),
        });
      } catch (e) {
        console.warn('Failed to mark webhook_event processed', e);
      }
    }

    return new Response(JSON.stringify({ success: true, successCount, failureCount }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  } catch (err: any) {
    console.error('send-order-notification error', err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500, headers: { 'Content-Type': 'application/json' } });
  }
});
