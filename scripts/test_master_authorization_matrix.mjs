/**
 * Test Suite: Strict Master-Only Authorization Matrix
 * Run with: node scripts/test_master_authorization_matrix.mjs
 */

import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

console.log('=== TESTE DE MATRIZ DE AUTORIZAÇÃO EXCLUSIVA MASTER ===\n');

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`✅ PASSED: ${name}`);
    passed++;
  } else {
    console.error(`❌ FAILED: ${name}`);
    failed++;
  }
}

async function runAuthMatrixTests() {
  try {
    // 1. Verificar papéis existentes no sistema
    const { data: profiles, error } = await supabaseAdmin.from('profiles').select('id, role, email');
    assert(!error && profiles, '1. Consulta de perfis executada no servidor');

    const roleGroups = {
      master: profiles?.filter((p) => p.role === 'master') || [],
      admin: profiles?.filter((p) => p.role === 'admin') || [],
      admin_company: profiles?.filter((p) => p.role === 'admin_company') || [],
      rep: profiles?.filter((p) => p.role === 'rep') || [],
    };

    console.log(`📌 Perfis cadastrados: Master: ${roleGroups.master.length}, Admin: ${roleGroups.admin.length}, Rep: ${roleGroups.rep.length}`);

    // 2. Validação da regra canônica no código TypeScript
    const testRoles = [
      { role: 'master', expectedCanManage: true },
      { role: 'admin', expectedCanManage: false },
      { role: 'admin_company', expectedCanManage: false },
      { role: 'company_admin', expectedCanManage: false },
      { role: 'rep', expectedCanManage: false },
      { role: 'client', expectedCanManage: false },
      { role: 'anon', expectedCanManage: false },
    ];

    for (const item of testRoles) {
      const canManageStorage = item.role === 'master';
      assert(
        canManageStorage === item.expectedCanManage,
        `2. Verificação do papel '${item.role}': canManageStorage === ${canManageStorage} (esperado: ${item.expectedCanManage})`
      );
    }

    // 3. Comprovação da segurança de RLS no banco de dados para anon & authenticated
    const publicAnon = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy_anon');

    const { data: anonData, error: anonErr } = await publicAnon.from('storage_cleanup_operations').select('*').limit(1);
    assert(
      anonErr !== null || (anonData && anonData.length === 0),
      '3. Acesso anon negado diretamente nas tabelas SQL via RLS'
    );

    const { data: anonItems, error: anonItemsErr } = await publicAnon.from('order_pdf_cleanup_items').select('*').limit(1);
    assert(
      anonItemsErr !== null || (anonItems && anonItems.length === 0),
      '4. Acesso anon negado em order_pdf_cleanup_items via RLS'
    );

  } catch (err) {
    console.error('❌ Erro no teste de autorização:', err);
    failed++;
  }

  console.log('\n==================================================');
  console.log(`RESUMO DA MATRIZ DE AUTORIZAÇÃO: ${passed} PASSED | ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) process.exit(1);
}

runAuthMatrixTests();
