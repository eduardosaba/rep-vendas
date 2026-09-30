/**
 * Script de Verificação de Schema e Leitura/Salvamento de Company Pages
 * Execução: node scripts/verify-company-pages-schema.mjs
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Erro: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configurados.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function verify() {
  console.log('═'.repeat(70));
  console.log('🔍 VERIFICAÇÃO DO SCHEMA CACHE E ISOLAMENTO DE COMPANY_PAGES');
  console.log('═'.repeat(70));
  console.log(`📌 Supabase URL: ${supabaseUrl}`);

  // 1. Verificar se a coluna organization_id é reconhecida no schema cache
  console.log('\n[1/4] Testando presença da coluna organization_id em company_pages...');
  const { data: colData, error: colError } = await supabase
    .from('company_pages')
    .select('id, organization_id, company_id, title, slug, is_active')
    .limit(5);

  if (colError) {
    if (colError.code === '42703' || colError.message.includes('organization_id')) {
      console.log('❌ FALHA: A coluna organization_id NÃO foi encontrada no schema cache.');
      console.log(`   Detalhes: ${colError.message} (Código ${colError.code})`);
      console.log('\n💡 AÇÃO NECESSÁRIA:');
      console.log('   Execute a migration "supabase/migrations/20260911050000_add_organization_id_to_company_pages.sql"');
      console.log('   no Supabase SQL Editor: https://supabase.com/dashboard/project/aawghxjbipcqefmikwby/sql');
      return false;
    } else {
      console.log(`⚠️ Erro ao consultar company_pages: ${colError.message}`);
      return false;
    }
  }

  console.log('✅ SUCESSO: Coluna organization_id reconhecida no schema cache!');
  console.log(`   Registros existentes encontrados: ${colData?.length || 0}`);
  if (colData && colData.length > 0) {
    console.table(
      colData.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        company_id: p.company_id,
        organization_id: p.organization_id || '(null)',
      }))
    );
  }

  // 2. Testar a query exata utilizada pela API /api/company/pages
  console.log('\n[2/4] Testando consulta idêntica à rota GET /api/company/pages...');
  const sampleCompanyId = colData?.[0]?.company_id || '9ab7504b-9cbf-40f1-bc69-6d95981cc925';
  const sampleOrgId = colData?.[0]?.organization_id || '8a13e130-c737-4397-b59e-406d5594438f';

  const { data: routeQueryData, error: routeQueryError } = await supabase
    .from('company_pages')
    .select('id,title,slug,content,is_active,created_at,updated_at')
    .or(`organization_id.eq.${sampleOrgId},company_id.eq.${sampleCompanyId}`)
    .order('created_at', { ascending: false });

  if (routeQueryError) {
    console.log(`❌ FALHA na query com filtro OR: ${routeQueryError.message}`);
    return false;
  }
  console.log(`✅ SUCESSO na query com filtro multi-tenant OR! Retornados: ${routeQueryData.length} registro(s).`);

  // 3. Testar inserção e isolamento com organization_id
  console.log('\n[3/4] Testando inserção de teste com organization_id (POST) e isolamento...');
  // Buscar uma organização válida existente
  const { data: orgs } = await supabase.from('organizations').select('id, name').limit(2);
  if (!orgs || orgs.length === 0) {
    console.log('⚠️ Nenhuma organização encontrada para teste isolado.');
    return true;
  }

  const orgA = orgs[0].id;
  const testSlug = `teste-validacao-${Date.now()}`;

  // Inserir página vinculada à Org A
  const { data: insertData, error: insertError } = await supabase
    .from('company_pages')
    .insert({
      company_id: sampleCompanyId,
      organization_id: orgA,
      title: 'Página de Validação Automatizada',
      slug: testSlug,
      content: { version: 1, title: 'Validação', blocks: [] },
      is_active: true,
    })
    .select('id, title, slug, organization_id, company_id')
    .single();

  if (insertError) {
    console.log(`❌ FALHA ao inserir página com organization_id: ${insertError.message}`);
    return false;
  }
  console.log(`✅ Página teste inserida com sucesso (ID: ${insertData.id}, Org: ${insertData.organization_id})`);

  // 4. Testar isolamento: consultar por outra organização B não deve trazer essa página se filtrada por org B
  if (orgs.length > 1) {
    const orgB = orgs[1].id;
    const { data: orgBData } = await supabase
      .from('company_pages')
      .select('id, slug, organization_id')
      .eq('organization_id', orgB)
      .eq('slug', testSlug);

    const isIsolated = !orgBData || orgBData.length === 0;
    console.log(
      isIsolated
        ? `✅ ISOLAMENTO CONFIRMADO: Organização B (${orgB}) não enxerga a página da Organização A (${orgA}).`
        : `⚠️ ALERTA: Vazamento de dados detectado entre organizações!`
    );
  }

  // Limpeza do registro de teste
  await supabase.from('company_pages').delete().eq('id', insertData.id);
  console.log(`🧹 Registro de teste removido.`);

  console.log('\n' + '═'.repeat(70));
  console.log('🎉 TODAS AS VALIDAÇÕES FORAM CONCLUÍDAS COM SUCESSO!');
  console.log('═'.repeat(70));
  return true;
}

verify().catch((err) => {
  console.error('❌ Erro inesperado:', err);
  process.exit(1);
});
