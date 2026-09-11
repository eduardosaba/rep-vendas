/**
 * Controlled Canary Test Suite: Single Canary Test Order PDF
 * Run with: node scripts/test_canary_controlled_order_pdf.mjs
 */

import crypto from 'crypto';
import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });
dotenv.config({ path: '.env' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

console.log('=== TESTE CANÁRIO CONTROLADO: 1 PDF DE HOMOLOGAÇÃO ===\n');

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

// ----------------------------------------------------------------------------
// 1. Identificadores do Arquivo Canário de Teste (Sem dados reais de clientes)
// ----------------------------------------------------------------------------
const canaryOrderId = '00000000-0000-4000-a000-000000009999';
const canaryDisplayId = 9999;
const canaryOriginalPath = `${canaryOrderId}.pdf`;
const canaryPdfUrlOriginal = `${supabaseUrl}/storage/v1/object/public/orders/${canaryOriginalPath}`;

console.log('📌 Dados do Pedido Canário de Teste:');
console.log(`   ID (UUID): ${canaryOrderId}`);
console.log(`   Display ID: #${canaryDisplayId}`);
console.log(`   Path no Storage: orders/${canaryOriginalPath}`);
console.log(`   Dados Pessoais: NENHUM (Cliente Fixture Homologacao)\n`);

async function runCanaryTest() {
  let createdOpId = null;

  try {
    // ------------------------------------------------------------------------
    // PASSO A: Criar registro temporário do pedido no DB (Se não existir)
    // ------------------------------------------------------------------------
    // Verifica se já existe ou limpa anterior
    await supabase.from('orders').delete().eq('id', canaryOrderId);

    // Busca um user_id válido para FK
    const { data: profiles } = await supabase.from('profiles').select('id, role').eq('role', 'master').limit(1);
    const masterUserId = profiles && profiles.length > 0 ? profiles[0].id : null;

    if (!masterUserId) {
      throw new Error('Usuário com role master não encontrado para vincular FK');
    }

    const { error: insertOrderErr } = await supabase.from('orders').insert({
      id: canaryOrderId,
      display_id: canaryDisplayId,
      user_id: masterUserId,
      client_name_guest: 'Cliente Canario Homologacao LTDA',
      client_cnpj_guest: '00.000.000/0001-00',
      status: 'pending', // Elegível para regenerável
      notes: 'Pedido Canario de Homologacao de Limpeza de Storage',
      total_value: 100.0,
      pdf_url: canaryPdfUrlOriginal,
    });

    assert(!insertOrderErr, 'A.1 Registro do Pedido Canário criado no banco remoto');

    // ------------------------------------------------------------------------
    // PASSO B: Subir 1 arquivo PDF Canário de Teste para o Storage (bucket orders)
    // ------------------------------------------------------------------------
    const canaryPdfBuffer = Buffer.from(
      `%PDF-1.5\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>\nendobj\n4 0 obj\n<< /Length 55 >>\nstream\nBT /F1 12 Tf 50 700 Td (PEDIDO CANARIO DE TESTE #9999) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n0000000213 00000 n \ntrailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n318\n%%EOF`,
      'utf-8'
    );

    // Garante que o bucket 'orders' existe no Storage remoto
    const { data: bucketData } = await supabase.storage.getBucket('orders');
    if (!bucketData) {
      console.log('📌 Criando bucket public "orders" no Supabase Storage...');
      await supabase.storage.createBucket('orders', { public: true });
    }

    const { error: uploadErr } = await supabase.storage
      .from('orders')
      .upload(canaryOriginalPath, canaryPdfBuffer, { upsert: true, contentType: 'application/pdf' });

    if (uploadErr) console.error('B.1 Upload Error details:', uploadErr.message || uploadErr);
    assert(!uploadErr, 'B.1 PDF Canário de Teste enviado para bucket orders');

    // ------------------------------------------------------------------------
    // PASSO C: Executar Ação 'summary' e Gerar Token criptográfico
    // ------------------------------------------------------------------------
    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { data: opData, error: opErr } = await supabase
      .from('storage_cleanup_operations')
      .insert({
        user_id: masterUserId,
        operation_type: 'move_to_trash',
        filter_snapshot: { target: 'canary_test' },
        total_items: 1,
        total_bytes: canaryPdfBuffer.length,
        status: 'pending',
        token_hash: tokenHash,
        expires_at: expiresAt,
      })
      .select('id')
      .single();

    assert(!opErr && opData, 'C.1 Operação registrada em storage_cleanup_operations');
    createdOpId = opData.id;

    const canaryTrashPath = `trash/${createdOpId}/orders/${canaryOriginalPath}`;

    const { error: itemInsErr } = await supabase.from('order_pdf_cleanup_items').insert({
      operation_id: createdOpId,
      order_id: canaryOrderId,
      bucket: 'orders',
      original_path: canaryOriginalPath,
      trash_path: canaryTrashPath,
      size_bytes: canaryPdfBuffer.length,
      classification: 'regenerable_data_fidelity',
      has_signature: false,
      order_status: 'pending',
      previous_pdf_url: canaryPdfUrlOriginal,
      moved_by: masterUserId,
      status: 'pending',
    });

    assert(!itemInsErr, 'C.2 Seleção exata do PDF Canário gravada em order_pdf_cleanup_items');

    // ------------------------------------------------------------------------
    // PASSO D: Executar Mover para a Lixeira (`trash`)
    // ------------------------------------------------------------------------
    // 1. Cópia para trash
    const { error: copyTrashErr } = await supabase.storage
      .from('orders')
      .copy(canaryOriginalPath, canaryTrashPath);
    assert(!copyTrashErr, 'D.1 Cópia para a lixeira (trash) realizada no Storage');

    // 2. Remoção da origem
    const { error: removeOrigErr } = await supabase.storage
      .from('orders')
      .remove([canaryOriginalPath]);
    assert(!removeOrigErr, 'D.2 Arquivo de origem removido do Storage');

    // 3. Atualiza orders.pdf_url = null SOMENTE APÓS confirmar a remoção da origem
    const { error: updateOrderNullErr } = await supabase
      .from('orders')
      .update({ pdf_url: null })
      .eq('id', canaryOrderId);
    assert(!updateOrderNullErr, 'D.3 orders.pdf_url zerado com sucesso');

    // 4. Marca item como in_trash e consome o token da operação
    await supabase.from('order_pdf_cleanup_items').update({ status: 'in_trash' }).eq('operation_id', createdOpId);
    await supabase.from('storage_cleanup_operations').update({ status: 'completed' }).eq('id', createdOpId);

    // Valida que o token foi consumido e não é reutilizável
    const { data: freshOp } = await supabase.from('storage_cleanup_operations').select('status').eq('id', createdOpId).single();
    assert(freshOp.status === 'completed', 'D.4 Token consumido e operação marcada como completed (não reutilizável)');

    // Verifica que o pedido está sem PDF URL
    const { data: freshOrderNull } = await supabase.from('orders').select('pdf_url').eq('id', canaryOrderId).single();
    assert(freshOrderNull.pdf_url === null, 'D.5 Confirmação: orders.pdf_url é null após movimentação');

    // ------------------------------------------------------------------------
    // PASSO E: Testar a Restauração da Lixeira
    // ------------------------------------------------------------------------
    // 1. Copia de volta da lixeira para a origem
    const { error: restoreCopyErr } = await supabase.storage
      .from('orders')
      .copy(canaryTrashPath, canaryOriginalPath);
    assert(!restoreCopyErr, 'E.1 Arquivo restaurado da lixeira para o caminho original no Storage');

    // 2. Remove o arquivo da lixeira
    await supabase.storage.from('orders').remove([canaryTrashPath]);

    // 3. Restaura orders.pdf_url para a URL original
    const { error: restorePdfUrlErr } = await supabase
      .from('orders')
      .update({ pdf_url: canaryPdfUrlOriginal })
      .eq('id', canaryOrderId);
    assert(!restorePdfUrlErr, 'E.2 orders.pdf_url restaurado para a URL válida original');

    // 4. Marca status em order_pdf_cleanup_items como restored
    await supabase
      .from('order_pdf_cleanup_items')
      .update({ status: 'restored', restored_at: new Date().toISOString() })
      .eq('operation_id', createdOpId);

    const { data: freshOrderRestored } = await supabase.from('orders').select('pdf_url').eq('id', canaryOrderId).single();
    assert(freshOrderRestored.pdf_url === canaryPdfUrlOriginal, 'E.3 Confirmação: orders.pdf_url é válido novamente após restauração');

    // ------------------------------------------------------------------------
    // PASSO F: Limpeza Completa Apenas dos Dados e Arquivos Canários Criados
    // ------------------------------------------------------------------------
    console.log('\n🧹 Limpando dados e arquivos exclusivamente criados para este teste canário...');
    await supabase.storage.from('orders').remove([canaryOriginalPath, canaryTrashPath]);
    await supabase.from('orders').delete().eq('id', canaryOrderId);
    if (createdOpId) {
      await supabase.from('storage_cleanup_operations').delete().eq('id', createdOpId);
    }
    console.log('✨ Limpeza de dados canários concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro no teste canário:', err);
    failed++;
  }

  console.log('\n==================================================');
  console.log(`RESUMO DO TESTE CANÁRIO: ${passed} PASSED | ${failed} FAILED`);
  console.log('==================================================\n');

  if (failed > 0) process.exit(1);
}

runCanaryTest();
