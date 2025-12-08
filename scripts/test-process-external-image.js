#!/usr/bin/env node
// Script de teste simples para chamar a rota /api/process-external-image
// Uso: node scripts/test-process-external-image.js [PRODUCT_ID] [EXTERNAL_IMAGE_URL]

const PORT = process.env.PORT || '3000';
const HOST = process.env.HOST || 'http://localhost';
const productId = process.argv[2] || 'TEST-PROD-123';
const externalUrl = process.argv[3] || 'https://via.placeholder.com/600';

const endpoint = `${HOST}:${PORT}/api/process-external-image`;

(async () => {
  console.log('Chamando endpoint:', endpoint);
  console.log('Payload:', { productId, externalUrl });
  try {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId, externalUrl }),
    });

    console.log('Status:', res.status);
    const text = await res.text();
    try {
      const json = JSON.parse(text);
      console.log('Resposta JSON:', JSON.stringify(json, null, 2));
    } catch {
      console.log('Resposta (texto):', text);
    }
  } catch (err) {
    console.error('Erro ao chamar endpoint:', String(err));
    process.exit(1);
  }
})();
