#!/usr/bin/env node
// scripts/test-send-order-admin.mjs
// Uso: node scripts/test-send-order-admin.mjs <vendor_id>

import dotenv from 'dotenv';
import fetch from 'node-fetch';
import admin from 'firebase-admin';

dotenv.config({ path: '.env.secrets' });
dotenv.config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const SERVICE_ROLE =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE || process.env.SUPABASE_SERVICE_ROLE_KEY;
const vendorId = process.argv[2] || process.env.TEST_VENDOR_ID;

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error('Defina NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no .env.local ou .env.secrets.');
  process.exit(1);
}
if (!vendorId) {
  console.error('Forneça vendor_id como argumento ou configure TEST_VENDOR_ID no .env.local');
  process.exit(1);
}

function normalizePrivateKey(raw) {
  if (!raw) return null;
  let k = raw.trim();
  if ((k.startsWith('"') && k.endsWith('"')) || (k.startsWith("'") && k.endsWith("'"))) {
    k = k.slice(1, -1);
  }
  return k.replace(/\\n/g, '\n');
}

const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY || process.env.FIREBASE_PRIVATE_KEY);
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || process.env.FIREBASE_CLIENT_EMAIL;
const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID;

if (!privateKey || !clientEmail || !projectId) {
  console.error('Variáveis do Firebase Admin faltando: FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL, FIREBASE_PROJECT_ID');
  process.exit(1);
}

try {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
} catch (e) {
  // ignore se já inicializado
}

async function fetchTokens(vendedorId) {
  const url = `${SUPABASE_URL}/rest/v1/user_fcm_tokens?select=token&user_id=eq.${encodeURIComponent(
    vendedorId
  )}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE}`,
      apikey: SERVICE_ROLE,
      Accept: 'application/json',
    },
  });
  if (!res.ok) throw new Error(`Supabase REST error: ${res.status} ${await res.text()}`);
  const json = await res.json();
  return json.map((r) => r.token).filter(Boolean);
}

(async () => {
  try {
    console.log('Buscando tokens para vendedor_id:', vendorId);
    const tokens = await fetchTokens(vendorId);
    console.log('Tokens encontrados:', tokens.length);
    if (!tokens.length) {
      console.log('Nenhum token registrado. Ative notificações em um dispositivo de teste.');
      process.exit(0);
    }

    const message = {
      notification: {
        title: '🛍️ Novo Pedido (teste via Admin SDK)',
        body: `Pedido de teste para vendedor ${vendorId}`,
      },
      data: {
        orderId: 'test-order-1',
        url: `/dashboard/orders/test-order-1`,
      },
      tokens: tokens.slice(0, 500),
    };

    console.log('Enviando multicast via Firebase Admin para', message.tokens.length, 'tokens...');
    const resp = await admin.messaging().sendMulticast(message);
    console.log('Resultado:', { successCount: resp.successCount, failureCount: resp.failureCount });
    if (resp.failureCount && resp.responses) {
      resp.responses.forEach((r, i) => {
        if (!r.success) console.error('Falha token:', message.tokens[i], r.error?.code || r.error?.message || r.error);
      });
    }
    process.exit(0);
  } catch (err) {
    console.error('Erro no teste:', err);
    process.exit(1);
  }
})();
