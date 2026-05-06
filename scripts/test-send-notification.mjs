#!/usr/bin/env node
// scripts/test-send-notification.mjs
// Uso: node scripts/test-send-notification.mjs '{"id":123,"vendedor_id":"<uuid>","cliente_nome":"Teste","total":99.9}'

import dotenv from 'dotenv';
import fetch from 'node-fetch';

dotenv.config({ path: '.env.local' });

const argv = process.argv[2];
const order = argv ? JSON.parse(argv) : {
  id: 'test-123',
  vendedor_id: process.env.TEST_VENDOR_ID || null,
  cliente_nome: 'Cliente Teste',
  total: 0,
};

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const FCM_SERVER_KEY = process.env.FCM_SERVER_KEY || process.env.FIREBASE_SERVER_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local ou no ambiente.');
  process.exit(1);
}
if (!FCM_SERVER_KEY) {
  console.error('Defina FCM_SERVER_KEY no .env.local (chave servidora legacy) para testes rápidos.');
  process.exit(1);
}
if (!order.vendedor_id) {
  console.error('Forneça vendedor_id no JSON de exemplo ou configure TEST_VENDOR_ID no .env.local');
  process.exit(1);
}

async function fetchTokens(vendedorId) {
  const url = `${SUPABASE_URL}/rest/v1/user_fcm_tokens?select=token&user_id=eq.${encodeURIComponent(vendedorId)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    throw new Error(`Supabase REST error: ${res.status} ${await res.text()}`);
  }
  const json = await res.json();
  return json.map((r) => r.token).filter(Boolean);
}

async function sendFcm(tokens, payload) {
  const fcmPayload = {
    registration_ids: tokens.slice(0, 1000),
    notification: payload.notification,
    data: payload.data,
  };

  const res = await fetch('https://fcm.googleapis.com/fcm/send', {
    method: 'POST',
    headers: {
      Authorization: `key=${FCM_SERVER_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(fcmPayload),
  });

  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

(async () => {
  try {
    console.log('Buscando tokens para vendedor_id:', order.vendedor_id);
    const tokens = await fetchTokens(order.vendedor_id);
    console.log('Tokens encontrados:', tokens.length);
    if (!tokens.length) {
      console.log('Nenhum token registrado. Termine um dispositivo clicando em Ativar notificações.');
      process.exit(0);
    }

    const payload = {
      notification: {
        title: '🛍️ Novo Pedido (teste)',
        body: `${order.cliente_nome || 'Cliente'} enviou pedido #${order.id}`,
      },
      data: {
        orderId: String(order.id),
        url: `/dashboard/orders/${order.id}`,
      },
    };

    console.log('Enviando FCM para', Math.min(tokens.length, 1000), 'tokens...');
    const result = await sendFcm(tokens, payload);
    console.log('FCM result:', result.status, result.text);
  } catch (err) {
    console.error('Erro no teste:', err);
    process.exit(1);
  }
})();
