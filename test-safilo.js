import fs from 'fs';
import dns from 'node:dns';

// Força IPv4 para evitar que o Node tente usar IPv6 (causa comum de 'fetch failed')
if (dns.setDefaultResultOrder) {
  dns.setDefaultResultOrder('ipv4first');
}

// Apenas habilite explicitamente em ambiente local definindo
// `ALLOW_INSECURE_TLS=1`. Isso será aplicado somente quando
// `NODE_ENV !== 'production'` para evitar mudanças inseguras em prod.
if (process.env.ALLOW_INSECURE_TLS === '1') {
  if (process.env.NODE_ENV !== 'production') {
    console.warn(
      'ALLOW_INSECURE_TLS=1 detected — insecure TLS bypass is disabled in source.\nTo run with insecure TLS for local testing, start the process with NODE_TLS_REJECT_UNAUTHORIZED=0 in your shell. Do NOT enable this in production.'
    );
  } else {
    console.warn('ALLOW_INSECURE_TLS is set but ignored in production environment');
  }
}

async function testDownload() {
  const targetUrl =
    'https://commportal-images.safilo.com/10/64/22/1064220FLL00_P00.JPG';
  console.log(`🚀 Iniciando teste blindado para: ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      method: 'GET',
      headers: {
        'User-Agent':
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        Accept:
          'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
        Referer: 'https://commportal.safilo.com/',
      },
      // Aumenta o tempo de espera
      signal: AbortSignal.timeout(60000),
    });

    console.log(`Status: ${response.status} ${response.statusText}`);

    if (response.ok) {
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      fs.writeFileSync('foto-teste-safilo.jpg', buffer);
      console.log('✅ SUCESSO! Imagem baixada.');
    } else {
      console.error('❌ FALHA NO SERVIDOR.');
      console.log(await response.text().then((t) => t.substring(0, 100)));
    }
  } catch (error) {
    console.error('💥 ERRO DETALHADO:');
    console.error('Mensagem:', error.message);
    // O cause revela se foi DNS, SSL ou Timeout
    if (error.cause) {
      console.error('Causa Real:', error.cause);
    }
  }
}

testDownload();
