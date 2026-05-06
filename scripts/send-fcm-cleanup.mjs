#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';
import { createClient } from '@supabase/supabase-js';

function loadServiceAccount() {
  if (process.env.FIREBASE_SERVICE_ACCOUNT) {
    try {
      return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
    } catch (e) {
      console.error('FIREBASE_SERVICE_ACCOUNT contém JSON inválido');
      process.exit(1);
    }
  }

  const envPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (envPath && fs.existsSync(envPath)) {
    return JSON.parse(fs.readFileSync(envPath, 'utf8'));
  }

  console.error('Nenhuma credencial encontrada. Defina GOOGLE_APPLICATION_CREDENTIALS ou FIREBASE_SERVICE_ACCOUNT.');
  process.exit(1);
}

const serviceAccount = loadServiceAccount();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente para usar este script.');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error('Uso: node scripts/send-fcm-cleanup.mjs <user_id> [tenant_id]');
    process.exit(1);
  }

  const userId = args[0];
  const tenantId = args[1] || null;

  // Busca tokens ativos para o usuário (e tenant se informado)
  let query = supabase.from('user_fcm_tokens').select('token,id,user_id,tenant_id').eq('user_id', userId);
  if (tenantId) query = query.eq('tenant_id', tenantId);
  const { data: tokensRows, error } = await query;
  if (error) {
    console.error('Erro ao buscar tokens:', error);
    process.exit(1);
  }

  const tokens = (tokensRows || []).map(r => r.token).filter(Boolean);
  if (tokens.length === 0) {
    console.log('Nenhum token encontrado para esse usuário.');
    process.exit(0);
  }

  console.log(`Enviando para ${tokens.length} tokens (user=${userId}${tenantId? ` tenant=${tenantId}`: ''})`);

  // Envia em chunks
  const chunkSize = 500;
  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize);
    const msg = {
      tokens: chunk,
      notification: { title: 'Teste Rep‑Vendas', body: 'Notificação de teste (cleanup).' },
      android: { notification: { channel_id: process.env.FCM_ANDROID_CHANNEL || 'repvendas_default' } },
      data: { source: 'admin-cleanup' }
    };

    try {
      const res = await admin.messaging().sendMulticast(msg);
      console.log(`Chunk ${i / chunkSize + 1}: success=${res.successCount} failure=${res.failureCount}`);
      if (res.failureCount > 0) {
        // Remover tokens inválidos do banco
        for (let j = 0; j < res.responses.length; j++) {
          const r = res.responses[j];
          if (!r.success) {
            const badToken = chunk[j];
            console.warn('Token inválido/removendo:', badToken, r.error?.code || r.error?.message || r.error);
            // delete by token and user_id (safety)
            const { error: delErr } = await supabase.from('user_fcm_tokens').delete().match({ token: badToken, user_id: userId });
            if (delErr) console.error('Falha ao deletar token inválido:', delErr);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao enviar chunk', err);
    }
  }
  console.log('Processo finalizado.');
  process.exit(0);
}

main();
