#!/usr/bin/env node
// Cria um produto de teste com imagens externas e marca sync_status='pending'
// Uso: node scripts/create-test-product.mjs --user=USER_ID --name="Produto Teste" --ref=TEST123

import minimist from 'minimist';
import { createClient } from '@supabase/supabase-js';

const argv = minimist(process.argv.slice(2));
const userId = argv.user || process.env.TEST_USER_ID || null;
const name = argv.name || 'Produto Teste (Sync)';
const reference = argv.ref || 'TEST-0001';

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em seu ambiente.'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  let targetUser = userId;
  if (!targetUser) {
    console.log(
      'Nenhum --user informado; tentando buscar um profile disponível...'
    );
    const { data: profiles, error: pErr } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    if (pErr) {
      console.error('Falha ao buscar profile:', pErr.message || pErr);
      process.exit(1);
    }
    if (!profiles || profiles.length === 0) {
      console.error('Nenhum profile disponível. Passe --user=USER_ID');
      process.exit(1);
    }
    targetUser = profiles[0].id;
    console.log('Usando user_id:', targetUser);
  }

  const images = [
    'https://commportal-images.safilo.com/10/09/81/100981000300_P00.JPG',
    'https://commportal-images.safilo.com/10/09/81/100981000300_P02.JPG',
    'https://commportal-images.safilo.com/10/09/81/100981000300_P07.JPG',
  ];

  const payload = {
    user_id: targetUser,
    name,
    reference_code: reference,
    brand: 'Safilo Test',
    category: 'Test',
    price: 0,
    images,
    external_image_url: images[0],
    image_url: null,
    image_path: null,
    sync_status: 'pending',
    is_active: true,
    created_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('products')
    .insert(payload)
    .select('*')
    .maybeSingle();
  if (error) {
    console.error('Erro ao criar produto:', error.message || error);
    process.exit(1);
  }

  console.log('Produto criado com sucesso:');
  console.log(JSON.stringify(data, null, 2));
  console.log(
    '\nAgora você pode chamar o endpoint de chunk para processar este produto:'
  );
  console.log(
    'curl -X POST http://localhost:3000/api/admin/sync-images -H "Authorization: Bearer O_SEU_TOKEN_AQUI"'
  );
}

main().catch((e) => {
  console.error('Erro inesperado:', e);
  process.exit(1);
});
