#!/usr/bin/env node
// Script para criar produtos de demonstração para um usuário existente
// Uso: node scripts/create-mock-products-for-user.mjs --email=teste@repvendas.com.br
// Requer: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente

import fs from 'fs';
import path from 'path';
import minimist from 'minimist';
import { createClient } from '@supabase/supabase-js';

const argv = minimist(process.argv.slice(2));
const email = argv.email || 'teste@repvendas.com.br';
const userIdArg = argv.user;

const SUPABASE_URL =
  process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente.');
  process.exit(1);
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function findUserIdByEmail(email) {
  try {
    // Tenta usar admin.getUserByEmail quando disponível
    if (
      supabaseAdmin.auth &&
      supabaseAdmin.auth.admin &&
      supabaseAdmin.auth.admin.getUserByEmail
    ) {
      const res = await supabaseAdmin.auth.admin.getUserByEmail(email);
      return res?.data?.user?.id || res?.user?.id || null;
    }

    // Fallback: listar usuários e procurar pelo email (pode ser paginado)
    if (
      supabaseAdmin.auth &&
      supabaseAdmin.auth.admin &&
      supabaseAdmin.auth.admin.listUsers
    ) {
      let page = 1;
      while (page < 20) {
        const { data } = await supabaseAdmin.auth.admin.listUsers({ page });
        const users = data?.users || data?.users || [];
        const found = users.find((u) => u.email === email);
        if (found) return found.id;
        if (!users || users.length === 0) break;
        page += 1;
      }
    }

    // Último recurso: buscar profile com campo email (se existir)
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('email', email)
      .limit(1);
    if (profiles && profiles.length > 0) return profiles[0].id;
  } catch (err) {
    console.warn(
      'Não foi possível obter user_id por email automaticamente:',
      err?.message || err
    );
  }
  return null;
}

async function main() {
  let userId = userIdArg || null;
  if (!userId) {
    console.log('Procurando user_id para', email);
    userId = await findUserIdByEmail(email);
      if (!userId) {
        console.log('Usuário não encontrado. Tentando criar usuário demo...');
        const password = argv.password || 'teste123';
        try {
          const createRes = await (supabaseAdmin.auth as any).admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: 'Usuário Demo' },
          });
          const newUser = createRes?.data?.user || createRes?.user || createRes?.data;
          userId = newUser?.id;
          if (!userId) {
            console.error('Falha ao criar usuário via admin.createUser:', createRes);
            process.exit(1);
          }
          console.log('Usuário criado com user_id:', userId);

          // Upsert settings básico para habilitar o catálogo demo
          let baseSlug = argv.slug || 'teste';
          // se slug já em uso, adiciona sufixo
          const { data: slugTaken } = await supabaseAdmin
            .from('public_catalogs')
            .select('id')
            .eq('slug', baseSlug)
            .maybeSingle();
          if (slugTaken) baseSlug = baseSlug + '-' + Math.random().toString(36).slice(2, 6);

          const { error: settingsErr } = await supabaseAdmin.from('settings').upsert({
            user_id: userId,
            name: 'Loja Demo',
            catalog_slug: baseSlug,
            primary_color: '#b9722e',
            secondary_color: '#0d1b2c',
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          if (settingsErr) console.warn('Aviso: falha ao upsert settings demo:', settingsErr.message || settingsErr);
          console.log('Configurações iniciais do demo aplicadas (slug:', baseSlug + ')');
        } catch (e) {
          console.error('Erro ao criar usuário demo:', e?.message || e);
          process.exit(1);
        }
      } else {
        console.log('Encontrado user_id:', userId);
      }
  }

  const file = path.resolve(process.cwd(), 'data', 'mock-products-teste.json');
  if (!fs.existsSync(file)) {
    console.error('Arquivo data/mock-products-teste.json não encontrado.');
    process.exit(1);
  }

  const raw = fs.readFileSync(file, 'utf8');
  const products = JSON.parse(raw);

  const inserted = [];
  for (const p of products) {
    const payload = {
      user_id: userId,
      name: p.name,
      reference_code: p.reference_code,
      brand: p.brand,
      category: p.category,
      description: p.description || null,
      images: p.external_urls || p.images || [],
      external_image_url: (p.external_urls && p.external_urls[0]) || null,
      price: p.price || 0,
      sale_price: p.sale_price || null,
      stock_quantity: p.stock_quantity || 0,
      is_active: true,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin
      .from('products')
      .insert(payload)
      .select('*')
      .maybeSingle();
    if (error) {
      console.error('Erro ao inserir produto', p.name, error.message || error);
    } else {
      inserted.push(data);
      console.log(
        'Produto criado:',
        data.id || data.reference_code || data.name
      );
    }
  }

  console.log('\nResumo: ' + inserted.length + ' produtos criados.');
}

main().catch((e) => {
  console.error('Erro inesperado:', e);
  process.exit(1);
});
