import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Configuração do Supabase ausente (.env.local)');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runBackfillPhase3() {
  console.log('🚀 Iniciando Backfill da Fase 3 para Pedidos B2B...');

  // 1. Busca todos os pedidos legados
  const { data: orders, error: ordersErr } = await supabase
    .from('orders')
    .select('id, user_id, company_id, status, seller_organization_id, commercial_status, operational_status, version');

  if (ordersErr) {
    console.error('❌ Erro ao buscar pedidos legados:', ordersErr);
    process.exit(1);
  }

  console.log(`📦 Encontrados ${orders?.length || 0} pedidos para processar.`);

  let updatedCount = 0;
  let skippedCount = 0;

  for (const order of orders || []) {
    // Se já tiver seller_organization_id e duplo status definidos, pula
    if (order.seller_organization_id && order.commercial_status && order.operational_status) {
      skippedCount++;
      continue;
    }

    // Identifica organização do vendedor via perfil do criador
    let sellerOrgId = order.seller_organization_id;
    if (!sellerOrgId && order.user_id) {
      const { data: member } = await supabase
        .from('organization_members')
        .select('organization_id')
        .eq('user_id', order.user_id)
        .eq('status', 'active')
        .maybeSingle();

      if (member) {
        sellerOrgId = member.organization_id;
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('organization_id, company_id')
          .eq('id', order.user_id)
          .single();

        sellerOrgId = profile?.organization_id || profile?.company_id || null;
      }
    }

    // Mapeamento dos status legados
    const legacyStatus = (order.status || 'draft').toLowerCase();
    let commercialStatus = 'draft';
    let operationalStatus = 'pending_fulfillment';

    if (legacyStatus === 'pending' || legacyStatus === 'submitted') {
      commercialStatus = 'submitted';
    } else if (legacyStatus === 'under_review') {
      commercialStatus = 'under_review';
    } else if (legacyStatus === 'approved') {
      commercialStatus = 'approved';
      operationalStatus = 'pending_fulfillment';
    } else if (legacyStatus === 'processing' || legacyStatus === 'in_production') {
      commercialStatus = 'approved';
      operationalStatus = 'processing';
    } else if (legacyStatus === 'shipped') {
      commercialStatus = 'approved';
      operationalStatus = 'shipped';
    } else if (legacyStatus === 'delivered' || legacyStatus === 'completed') {
      commercialStatus = 'approved';
      operationalStatus = 'delivered';
    } else if (legacyStatus === 'rejected') {
      commercialStatus = 'rejected';
    } else if (legacyStatus === 'cancelled') {
      commercialStatus = 'cancelled';
      operationalStatus = 'cancelled';
    }

    const { error: updateErr } = await supabase
      .from('orders')
      .update({
        seller_organization_id: sellerOrgId,
        rep_user_id: order.user_id,
        created_by_user_id: order.user_id,
        commercial_status: commercialStatus,
        operational_status: operationalStatus,
        version: order.version || 1,
      })
      .eq('id', order.id);

    if (updateErr) {
      console.error(`⚠️ Erro ao atualizar pedido ${order.id}:`, updateErr.message);
    } else {
      updatedCount++;
    }
  }

  console.log(`✅ Backfill da Fase 3 Concluído com sucesso!`);
  console.log(`📊 Atualizados: ${updatedCount} | Mantidos: ${skippedCount}`);
}

runBackfillPhase3();
