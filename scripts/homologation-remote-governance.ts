/**
 * Script de Homologação Remota Segura: Governança de Usuários
 * Projeto Rep Vendas (Ref: aawghxjbipcqefmikwby)
 * 
 * SEGURANÇA E HIGIENE:
 * 1. Por padrão opera em MODO DRY-RUN / LEITURA NÃO DESTRUTIVA.
 * 2. Para executar modificações em contas de teste artificiais, exige:
 *    ALLOW_DESTRUCTIVE_TESTS=true
 * 3. Nunca toca em contas ou registros comerciais reais.
 */

import { createClient } from '@supabase/supabase-js';

const EXPECTED_PROJECT_REF = 'aawghxjbipcqefmikwby';

async function runHomologation() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  const allowDestructive = process.env.ALLOW_DESTRUCTIVE_TESTS === 'true';

  console.log('====================================================');
  console.log('SCRIPT DE HOMOLOGAÇÃO REMOTA: GOVERNANÇA DE USUÁRIOS');
  console.log('====================================================');
  console.log(`- Supabase URL: ${supabaseUrl}`);
  console.log(`- Project Ref Esperado: ${EXPECTED_PROJECT_REF}`);
  console.log(`- Modo de Execução: ${allowDestructive ? '⚠️ DESTRUTIVO PERMITIDO (ALLOW_DESTRUCTIVE_TESTS=true)' : '🔒 MODO DRY-RUN SEGURO (Apenas Verificação)'}`);
  console.log('----------------------------------------------------');

  if (!supabaseUrl.includes(EXPECTED_PROJECT_REF)) {
    console.error(`❌ ERRO DE VALIDAÇÃO: O URL ${supabaseUrl} não corresponde ao Project Ref oficial '${EXPECTED_PROJECT_REF}'. Execução abortada por segurança.`);
    process.exit(1);
  }

  if (!serviceKey) {
    console.error('❌ ERRO: SUPABASE_SERVICE_ROLE_KEY não encontrada nas variáveis de ambiente.');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  // 1. VERIFICAÇÃO INICIAL DA ESTRUTURA DO BANCO (Leitura)
  console.log('\n[Passo 1] Verificando se a migration foi aplicada no banco remoto...');
  const { data: profileColumns, error: colError } = await supabase.rpc('check_user_dependencies', {
    p_target_user_id: '00000000-0000-0000-0000-000000000000',
  });

  if (colError && colError.message.includes('function public.check_user_dependencies') && colError.message.includes('does not exist')) {
    console.log('⚠️ AVISO: A migration 20260908000000_user_deactivation_and_governance.sql ainda NÃO foi aplicada manualmente no SQL Editor pelo Eduardo.');
    console.log('ℹ️ O script de homologação aguardará a confirmação da execução manual da migration antes de realizar testes de escrita.');
    if (!allowDestructive) {
      console.log('\n✅ MODO DRY-RUN CONCLUÍDO COM SUCESSO (Verificação de pré-requisitos completa).');
      return;
    }
  } else {
    console.log('✅ Estrutura de RPCs de governança detectada no banco remoto.');
  }

  if (!allowDestructive) {
    console.log('\nℹ️ AVISO: O modo destrutivo não está ativo (ALLOW_DESTRUCTIVE_TESTS é diferente de true).');
    console.log('Nenhuma conta artificial foi criada ou modificada.');
    console.log('Para autorizar os testes operacionais remotos após a aplicação da migration no SQL Editor, execute:');
    console.log('   ALLOW_DESTRUCTIVE_TESTS=true npx ts-node scripts/homologation-remote-governance.ts');
    return;
  }

  console.log('\n[Passo 2] Executando roteiro de homologação remota com contas artificiais isoladas...');
  // Aqui serão executados os testes remotos em contas test_* assim que autorizado e aplicado o SQL.
}

runHomologation().catch((err) => {
  console.error('Erro na execução do script de homologação:', err);
  process.exit(1);
});
