import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ Chaves de ambiente NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY não encontradas.');
  process.exit(1);
}

const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const TEST_ORDER_1 = '00000000-0000-0000-0000-000000000001';
const TEST_ORDER_2 = '00000000-0000-0000-0000-000000000002';
const TEST_ORDER_4 = '00000000-0000-0000-0000-000000000004';

async function cleanupFixtures() {
  await adminClient.from('order_status_history').delete().in('order_id', [TEST_ORDER_1, TEST_ORDER_2, TEST_ORDER_4]);
  await adminClient.from('order_items').delete().in('order_id', [TEST_ORDER_1, TEST_ORDER_2, TEST_ORDER_4]);
  await adminClient.from('orders').delete().in('id', [TEST_ORDER_1, TEST_ORDER_2, TEST_ORDER_4]);
}

async function runIntegrationSuite() {
  console.log('================================================================');
  console.log('🧪 SUÍTE DE HOMOLOGAÇÃO AUTOMATIZADA — PEDIDO V3 (SUPABASE REAL)');
  console.log('================================================================\n');

  await cleanupFixtures();

  // 1. Buscar um usuário real na base do Supabase
  const { data: profile } = await adminClient
    .from('profiles')
    .select('id, organization_id, company_id')
    .limit(1)
    .single();

  if (!profile) {
    console.error('❌ Nenhum usuário encontrado em profiles.');
    process.exit(1);
  }

  const TEST_USER = profile.id;
  console.log(`ℹ️ Executando suíte usando usuário real do banco: ${TEST_USER}\n`);

  // Instanciar OrderService passando adminClient (service role)
  const { OrderService } = await import('../domain/orders/OrderService');
  const service = new OrderService(adminClient);

  let passedTests = 0;
  let totalTests = 6;

  // --------------------------------------------------------------------------------------------------
  // CENÁRIO 1: FLUXO REGULAR COMERCIALE LOGÍSTICO + VERIFICAÇÃO DE VERSÃO E SINCRONIZAÇÃO LEGADA
  // --------------------------------------------------------------------------------------------------
  console.log('📌 CENÁRIO 1: Fluxo Regular Comercial ➔ Operacional (draft ➔ pending_approval ➔ approved)');
  try {
    const { error: insErr } = await adminClient.from('orders').insert({
      id: TEST_ORDER_1,
      user_id: TEST_USER,
      commercial_status: 'draft',
      operational_status: 'pending',
      status: 'Pendente',
      version: 1,
      total_value: 500,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    if (insErr) throw new Error('Falha ao criar fixture 1: ' + insErr.message);

    const res1 = await service.submitForApproval(TEST_USER, TEST_ORDER_1, 1, 'Submetendo via representante');
    if (res1.expectedVersion !== 2 || res1.commercialStatus !== 'pending_approval') {
      throw new Error(`Draft->Submitted falhou. Versão esperada 2, obtida ${res1.expectedVersion}`);
    }

    const { data: o1 } = await adminClient.from('orders').select('*').eq('id', TEST_ORDER_1).single();
    if (o1.version !== 2 || o1.commercial_status !== 'pending_approval' || o1.status !== 'Pendente') {
      throw new Error('Estado do banco divergente após submitForApproval');
    }

    const res2 = await service.approveOrder(TEST_USER, TEST_ORDER_1, 2, 'Aprovado pelo gestor comercial');
    if (res2.expectedVersion !== 3 || res2.commercialStatus !== 'approved' || res2.operationalStatus !== 'pending') {
      throw new Error(`Submitted->Approved falhou. Versão esperada 3, obtida ${res2.expectedVersion}`);
    }

    const { data: o2 } = await adminClient.from('orders').select('*').eq('id', TEST_ORDER_1).single();
    if (o2.version !== 3 || o2.commercial_status !== 'approved' || o2.status !== 'Faturado') {
      throw new Error('Sincronização legada "Faturado" falhou no banco');
    }

    console.log('   ✅ Cenário 1 Aprovado com sucesso! (Versão avançou 1 ➔ 2 ➔ 3 e status legado sincronizado)');
    passedTests++;
  } catch (err: any) {
    console.error('   ❌ Cenário 1 Falhou:', err.message);
  }

  // --------------------------------------------------------------------------------------------------
  // CENÁRIO 2: CONCORRÊNCIA OTIMISTA (OCC) COM VERIFICAÇÃO DE SEM MUTATIVIDADE
  // --------------------------------------------------------------------------------------------------
  console.log('\n📌 CENÁRIO 2: Concorrência Otimista (OCC) — Rejeição de versão defasada');
  try {
    let occTriggered = false;
    try {
      await service.startFulfillment(TEST_USER, TEST_ORDER_1, 1, 'Tentativa concorrente com versão antiga');
    } catch (err: any) {
      if (err.message === 'CONFLICT_VERSION') {
        occTriggered = true;
      } else {
        throw new Error(`Esperado erro CONFLICT_VERSION, mas obteve: ${err.message}`);
      }
    }

    if (!occTriggered) {
      throw new Error('OCC falhou: Permitiu transição com versão desatualizada!');
    }

    const { data: oOCC } = await adminClient.from('orders').select('*').eq('id', TEST_ORDER_1).single();
    if (oOCC.version !== 3 || oOCC.operational_status !== 'pending') {
      throw new Error(`FALHA DE INTEGRIDADE OCC: O estado foi modificado indevidamente! Versão atual: ${oOCC.version}`);
    }

    const { data: hOCC } = await adminClient.from('order_status_history').select('*').eq('order_id', TEST_ORDER_1);
    if (hOCC?.length !== 3) {
      throw new Error(`FALHA DE HISTÓRICO OCC: Inseriu histórico indevido na falha! Total de registros: ${hOCC?.length}`);
    }

    console.log('   ✅ Cenário 2 Aprovado com sucesso! (Retornou CONFLICT_VERSION, versão mantida em 3, zero mutação no banco e zero histórico excedente)');
    passedTests++;
  } catch (err: any) {
    console.error('   ❌ Cenário 2 Falhou:', err.message);
  }

  // --------------------------------------------------------------------------------------------------
  // CENÁRIO 3: ESTEIRA OPERACIONAL LOGÍSTICA (PROCESSING ➔ SHIPPED ➔ DELIVERED)
  // --------------------------------------------------------------------------------------------------
  console.log('\n📌 CENÁRIO 3: Esteira Operacional Logística (pending ➔ picking ➔ shipped ➔ delivered)');
  try {
    const res3 = await service.startFulfillment(TEST_USER, TEST_ORDER_1, 3, 'Iniciando separação no depósito');
    if (res3.expectedVersion !== 4 || res3.operationalStatus !== 'picking') {
      throw new Error(`startFulfillment falhou. Versão esperada 4, obtida ${res3.expectedVersion}`);
    }

    const res4 = await service.shipOrder(TEST_USER, TEST_ORDER_1, 4, 'BR123456789BR', 'Despachado via Correios');
    if (res4.expectedVersion !== 5 || res4.operationalStatus !== 'shipped') {
      throw new Error(`shipOrder falhou. Versão esperada 5, obtida ${res4.expectedVersion}`);
    }

    const { data: oShipped } = await adminClient.from('orders').select('*').eq('id', TEST_ORDER_1).single();
    if (oShipped.tracking_code !== 'BR123456789BR' || oShipped.status !== 'Despachado') {
      throw new Error('Sincronização de rastreamento e status "Despachado" falhou no banco');
    }

    const res5 = await service.deliverOrder(TEST_USER, TEST_ORDER_1, 5, 'Entregue na recepção da Ótica');
    if (res5.expectedVersion !== 6 || res5.operationalStatus !== 'delivered') {
      throw new Error(`deliverOrder falhou. Versão esperada 6, obtida ${res5.expectedVersion}`);
    }

    const { data: oDelivered } = await adminClient.from('orders').select('*').eq('id', TEST_ORDER_1).single();
    if (oDelivered.status !== 'Entregue') {
      throw new Error('Sincronização legada "Entregue" falhou');
    }

    console.log('   ✅ Cenário 3 Aprovado com sucesso! (Status final: Delivered / Entregue com código de rastreamento)');
    passedTests++;
  } catch (err: any) {
    console.error('   ❌ Cenário 3 Falhou:', err.message);
  }

  // --------------------------------------------------------------------------------------------------
  // CENÁRIO 4: TRAVA DE GOVERNANÇA (TENTATIVA DE SEPARAÇÃO EM PEDIDO NÃO APROVADO)
  // --------------------------------------------------------------------------------------------------
  console.log('\n📌 CENÁRIO 4: Trava de Governança — Rejeição de Separação em Pedido Não Aprovado');
  try {
    await adminClient.from('orders').insert({
      id: TEST_ORDER_2,
      user_id: TEST_USER,
      commercial_status: 'pending_approval',
      operational_status: 'pending',
      status: 'Pendente',
      version: 1,
      total_value: 300,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    let govBlocked = false;
    try {
      await service.startFulfillment(TEST_USER, TEST_ORDER_2, 1, 'Tentativa indevida de separação');
    } catch (err: any) {
      if (err.message.includes('Operacional só avança com pedido APROVADO')) {
        govBlocked = true;
      } else {
        throw new Error(`Erro inesperado na governança: ${err.message}`);
      }
    }

    if (!govBlocked) {
      throw new Error('FALHA DE GOVERNANÇA: Permitiu separação de pedido não aprovado comercialmente!');
    }

    console.log('   ✅ Cenário 4 Aprovado com sucesso! (Bloqueou a separação com mensagem explícita de governança)');
    passedTests++;
  } catch (err: any) {
    console.error('   ❌ Cenário 4 Falhou:', err.message);
  }

  // --------------------------------------------------------------------------------------------------
  // CENÁRIO 5: FLUXO DE MESA DE CRÉDITO (WAITING_FINANCE)
  // --------------------------------------------------------------------------------------------------
  console.log('\n📌 CENÁRIO 5: Mesa Financeira (pending_approval ➔ pending_approval / WAITING_FINANCE ➔ approved)');
  try {
    const resReview = await service.sendToCreditReview(TEST_USER, TEST_ORDER_2, 1, 'Estouro do limite rotativo de R$ 5.000');
    if (resReview.commercialStatus !== 'pending_approval') {
      throw new Error('Falha ao enviar pedido para análise de crédito');
    }

    const { data: oReview } = await adminClient.from('orders').select('*').eq('id', TEST_ORDER_2).single();
    if (oReview.status !== 'WAITING_FINANCE') {
      throw new Error(`Status legado da mesa financeira deveria ser WAITING_FINANCE, obtido: ${oReview.status}`);
    }

    const resApprove = await service.approveOrder(TEST_USER, TEST_ORDER_2, 2, 'Crédito estendido pela diretoria financeira');
    if (resApprove.commercialStatus !== 'approved' || resApprove.operationalStatus !== 'pending') {
      throw new Error('Aprovação financeira falhou');
    }

    console.log('   ✅ Cenário 5 Aprovado com sucesso! (WAITING_FINANCE liberado com sucesso para esteira operacional)');
    passedTests++;
  } catch (err: any) {
    console.error('   ❌ Cenário 5 Falhou:', err.message);
  }

  // --------------------------------------------------------------------------------------------------
  // CENÁRIO 6: POLÍTICA DE EXCLUSÃO SEGURA (DELETE_ORDER)
  // --------------------------------------------------------------------------------------------------
  console.log('\n📌 CENÁRIO 6: Política de Exclusão Segura — Retenção de Histórico Auditável');
  try {
    let deleteBlocked = false;
    try {
      await service.deleteOrder(TEST_USER, TEST_ORDER_2);
    } catch (err: any) {
      if (err.message.includes('não podem ser excluídos fisicamente')) {
        deleteBlocked = true;
      }
    }

    if (!deleteBlocked) {
      throw new Error('FALHA DE SEGURANÇA: Permitiu exclusão física de pedido comercialmente processado!');
    }

    await adminClient.from('orders').insert({
      id: TEST_ORDER_4,
      user_id: TEST_USER,
      commercial_status: 'draft',
      operational_status: 'pending',
      status: 'Pendente',
      version: 1,
      total_value: 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const deletedOk = await service.deleteOrder(TEST_USER, TEST_ORDER_4);
    if (!deletedOk) throw new Error('Falha ao excluir pedido draft');

    const { data: o4Check } = await adminClient.from('orders').select('id').eq('id', TEST_ORDER_4).maybeSingle();
    if (o4Check) throw new Error('Pedido draft continuou existindo após deleteOrder');

    console.log('   ✅ Cenário 6 Aprovado com sucesso! (Bloqueou exclusão física de pedido submetido; permitiu apenas em draft)');
    passedTests++;
  } catch (err: any) {
    console.error('   ❌ Cenário 6 Falhou:', err.message);
  }

  await cleanupFixtures();

  console.log('\n================================================================');
  console.log(`📊 RESULTADO DA HOMOLOGAÇÃO AUTOMATIZADA: ${passedTests}/${totalTests} PASSARAM`);
  console.log('================================================================\n');

  if (passedTests === totalTests) {
    console.log('🎉 TODOS OS CENÁRIOS FORAM COMPROVADOS COM EXCESSO DE RIGOR NO SUPABASE REAL!');
    process.exit(0);
  } else {
    console.error('❌ ALGUNS TESTES FALHARAM.');
    process.exit(1);
  }
}

runIntegrationSuite().catch((err) => {
  console.error('Erro fatal ao rodar suíte de testes:', err);
  process.exit(1);
});
