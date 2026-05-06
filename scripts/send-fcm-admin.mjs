#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import admin from 'firebase-admin';

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

async function main() {
  const args = process.argv.slice(2);
  let tokens = [];

  if (args.length === 0) {
    console.error('Uso: node scripts/send-fcm-admin.mjs token1 token2  OR  --file tokens.json');
    process.exit(1);
  }

  if (args[0] === '--file') {
    const file = args[1];
    if (!file) {
      console.error('Passe o caminho do arquivo depois de --file');
      process.exit(1);
    }
    const content = fs.readFileSync(path.resolve(file), 'utf8');
    tokens = JSON.parse(content);
  } else {
    tokens = args;
  }

  if (!Array.isArray(tokens) || tokens.length === 0) {
    console.error('Nenhum token fornecido');
    process.exit(1);
  }

  // Limite do sendMulticast: 500 tokens por chamada
  const chunkSize = 500;
  for (let i = 0; i < tokens.length; i += chunkSize) {
    const chunk = tokens.slice(i, i + chunkSize);
    const message = {
      tokens: chunk,
      notification: {
        title: 'Teste — Rep‑Vendas',
        body: 'Esta é uma notificação de teste enviada via firebase-admin.'
      },
      android: {
        notification: {
          channel_id: process.env.FCM_ANDROID_CHANNEL || 'repvendas_default',
          default_vibrate_timings: true,
          default_sound: true
        }
      },
      data: {
        source: 'admin-script'
      }
    };

    try {
      const response = await admin.messaging().sendMulticast(message);
      console.log(`Enviado chunk ${i / chunkSize + 1}: success=${response.successCount} failure=${response.failureCount}`);
      if (response.failureCount > 0) {
        response.responses.forEach((r, idx) => {
          if (!r.success) {
            console.error('Token failed:', chunk[idx], r.error?.toString());
          }
        });
      }
    } catch (err) {
      console.error('Erro ao enviar multicast', err);
    }
  }
  process.exit(0);
}

main();
