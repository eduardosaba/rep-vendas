#!/usr/bin/env node
/**
 * Verifica e copia banners de settings para public_catalogs
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Erro: Variáveis de ambiente do Supabase não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAndCopyBanners() {
  console.log('🔍 Verificando banners em settings...\n');

  // Buscar todas as settings com banners
  const { data: settings, error: settingsError } = await supabase
    .from('settings')
    .select('user_id, banners, banners_mobile')
    .or('banners.not.is.null,banners_mobile.not.is.null');

  if (settingsError) {
    console.error('❌ Erro ao buscar settings:', settingsError);
    return;
  }

  console.log(
    `✅ Encontrado ${settings?.length || 0} registros com banners em settings\n`
  );

  if (!settings || settings.length === 0) {
    console.log('⚠️ Nenhum banner encontrado em settings');
    return;
  }

  // Exibir dados encontrados
  for (const setting of settings) {
    console.log(`User: ${setting.user_id}`);
    console.log(`  banners: ${JSON.stringify(setting.banners)}`);
    console.log(`  banners_mobile: ${JSON.stringify(setting.banners_mobile)}`);
    console.log('');
  }

  // Copiar para public_catalogs
  console.log('📋 Copiando banners para public_catalogs...\n');

  for (const setting of settings) {
    const { error: updateError } = await supabase
      .from('public_catalogs')
      .update({
        banners: setting.banners,
        banners_mobile: setting.banners_mobile,
      })
      .eq('user_id', setting.user_id);

    if (updateError) {
      console.error(
        `❌ Erro ao atualizar user ${setting.user_id}:`,
        updateError
      );
    } else {
      console.log(`✅ Atualizado user ${setting.user_id}`);
    }
  }

  console.log('\n✅ Processo concluído!');
}

checkAndCopyBanners().catch(console.error);
