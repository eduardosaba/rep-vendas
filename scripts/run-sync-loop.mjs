// Script simples para disparar repetidamente /api/admin/sync-images
// Uso: BASE_URL=http://localhost:3000 node scripts/run-sync-loop.mjs

const base = process.env.BASE_URL || 'http://localhost:3000';

async function runOnce() {
  try {
    const res = await fetch(`${base}/api/admin/sync-images`, {
      method: 'POST',
    });
    const data = await res.json();
    console.log(
      new Date().toISOString(),
      'status:',
      res.status,
      data.message || JSON.stringify(data.detalhes || data)
    );
    return data;
  } catch (err) {
    console.error('Request error', err);
    return { error: String(err) };
  }
}

(async () => {
  console.log('Starting sync loop against', base);
  while (true) {
    const data = await runOnce();

    if (
      data &&
      (data.message === 'Nenhuma imagem pendente.' ||
        (data.message === 'Processamento concluído' &&
          data.detalhes &&
          data.detalhes.success === 0 &&
          data.detalhes.failed === 0))
    ) {
      console.log('No pending images. Exiting loop.');
      process.exit(0);
    }

    // Se ocorreu erro crítico, aguarda e tenta novamente
    if (data && data.error) {
      console.error(
        'Erro na API:',
        data.error,
        '— aguardando 5s e tentando novamente'
      );
      await new Promise((r) => setTimeout(r, 5000));
      continue;
    }

    // Aguarda 1s entre lotes para evitar throttling
    await new Promise((r) => setTimeout(r, 1000));
  }
})();
