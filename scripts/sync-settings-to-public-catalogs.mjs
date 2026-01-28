#!/usr/bin/env node
/*
  Script para sincronizar a tabela `settings` com `public_catalogs`.
  Uso: exporte `NEXT_PUBLIC_SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` e execute:
    node scripts/sync-settings-to-public-catalogs.mjs

  Observações:
  - Este script usa a Service Role Key, rode apenas em ambiente seguro.
  - Ele atualiza registros existentes (por user_id) e cria novos quando necessário,
    pulando slugs já em uso por outra loja.
*/

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    'Faltam variáveis de ambiente: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY'
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function main() {
  console.log('Buscando settings com catalog_slug...');
  const { data: settings, error } = await supabase
    .from('settings')
    .select('*')
    .not('catalog_slug', 'is', null);

  if (error) {
    console.error('Erro ao buscar settings:', error.message || error);
    process.exit(1);
  }

  console.log(`Encontrados ${settings.length} settings com catalog_slug`);

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const s of settings) {
    const userId = s.user_id;
    const slug = (s.catalog_slug || '').toString().toLowerCase();
    if (!slug) continue;

    // Verifica se já existe um public_catalogs para este usuário
    const { data: existing, error: existErr } = await supabase
      .from('public_catalogs')
      .select('id, slug')
      .eq('user_id', userId)
      .maybeSingle();
    if (existErr) {
      console.warn(
        `Erro checando public_catalogs do user ${userId}:`,
        existErr.message || existErr
      );
      continue;
    }

    const payload = {
      user_id: userId,
      slug: slug,
      store_name: s.name || 'Loja',
      logo_url: s.logo_url ?? null,
      primary_color: s.primary_color ?? '#b9722e',
      secondary_color: s.secondary_color ?? '#0d1b2c',
      header_background_color: s.header_background_color ?? '#ffffff',
      show_sale_price: s.show_sale_price ?? true,
      show_cost_price: s.show_cost_price ?? false,
      enable_stock_management: s.enable_stock_management ?? false,
      show_installments: s.show_installments ?? false,
      max_installments: s.max_installments ?? 1,
      show_cash_discount: s.show_cash_discount ?? false,
      cash_price_discount_percent: s.cash_price_discount_percent ?? 0,
      footer_message: s.footer_message ?? null,
      is_active: s.is_active ?? true,
      price_password_hash: s.price_password_hash ?? null,
      banners: s.banners ?? null,
      banners_mobile: s.banners_mobile ?? null,
      top_benefit_image_url: s.top_benefit_image_url ?? null,
      top_benefit_image_fit: s.top_benefit_image_fit ?? null,
      top_benefit_image_scale: s.top_benefit_image_scale ?? null,
      top_benefit_height: s.top_benefit_height ?? null,
      top_benefit_text_size: s.top_benefit_text_size ?? null,
      top_benefit_bg_color: s.top_benefit_bg_color ?? null,
      top_benefit_text_color: s.top_benefit_text_color ?? null,
      top_benefit_text: s.top_benefit_text ?? null,
      show_top_benefit_bar: s.show_top_benefit_bar ?? false,
      show_top_info_bar: s.show_top_info_bar ?? true,
      font_family: s.font_family ?? null,
      font_url: s.font_url ?? null,
      share_banner_url: s.share_banner_url ?? null,
      og_image_url: s.og_image_url ?? null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    if (existing) {
      // Atualiza
      const { error: upErr } = await supabase
        .from('public_catalogs')
        .update(payload)
        .eq('user_id', userId);
      if (upErr) {
        console.error(
          `Falha ao atualizar public_catalogs para user ${userId}:`,
          upErr.message || upErr
        );
        continue;
      }
      updated += 1;
      console.log(`Updated public_catalogs for user ${userId} (slug=${slug})`);
    } else {
      // Verifica se slug já existe
      const { data: slugExists } = await supabase
        .from('public_catalogs')
        .select('id')
        .eq('slug', slug)
        .maybeSingle();
      if (slugExists) {
        skipped += 1;
        console.warn(
          `Skipping user ${userId}: slug '${slug}' already in use by another catalog`
        );
        continue;
      }

      const { error: insErr } = await supabase
        .from('public_catalogs')
        .insert(payload);
      if (insErr) {
        console.error(
          `Falha ao inserir public_catalogs para user ${userId}:`,
          insErr.message || insErr
        );
        continue;
      }
      created += 1;
      console.log(`Inserted public_catalogs for user ${userId} (slug=${slug})`);
    }
  }

  console.log('Sincronização concluída:', { created, updated, skipped });
  process.exit(0);
}

main().catch((err) => {
  console.error('Erro inesperado:', err);
  process.exit(1);
});
