import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('❌ Variáveis de ambiente Supabase ausentes em .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  console.log('====================================================');
  console.log('   AUDITORIA DE INTEGRIDADE MULTI-TENANT REPVENDAS  ');
  console.log('====================================================\n');

  const { data: profiles, error: pErr } = await supabase
    .from('profiles')
    .select('id, email, full_name, role, company_id, organization_id, can_manage_catalog')
    .order('created_at', { ascending: false });

  const { data: companies, error: cErr } = await supabase
    .from('companies')
    .select('id, name, slug, order_management_mode, block_new_orders, metadata')
    .order('name');

  const { data: organizations, error: oErr } = await supabase
    .from('organizations')
    .select('id, name, slug, organization_type, owner_user_id, metadata, is_active');

  const { data: memberships, error: mErr } = await supabase
    .from('organization_members')
    .select('organization_id, user_id, role, status');

  const { data: orders, error: ordErr } = await supabase
    .from('orders')
    .select('id, display_id, company_id, user_id, seller_id')
    .order('created_at', { ascending: false })
    .limit(100);

  if (pErr || cErr || oErr || mErr) {
    console.error('Erro ao consultar banco:', { pErr, cErr, oErr, mErr });
    return;
  }

  const companyMap = new Map((companies || []).map((c) => [c.id, c]));
  const orgMap = new Map((organizations || []).map((o) => [o.id, o]));
  const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

  let issueCount = 0;

  console.log('--- 1. AUDITORIA: REPRESENTANTES AUTÔNOMOS COM COMPANY_ID ---');
  const autonomousWithCompany = (profiles || []).filter((p) => {
    const r = (p.role || '').toLowerCase().trim();
    return (r === 'rep' || r === 'user') && p.company_id;
  });
  console.log(`Encontrados: ${autonomousWithCompany.length}`);
  autonomousWithCompany.forEach((p) => {
    issueCount++;
    const comp = companyMap.get(p.company_id);
    console.log(`  ⚠️ Usuário [${p.role}] ${p.email} está com company_id: ${p.company_id} (${comp?.name || 'Inexistente'})`);
  });

  console.log('\n--- 2. AUDITORIA: REPRESENTANTES VINCULADOS SEM DISTRIBUIDORA VÁLIDA ---');
  const linkedWithoutValidCompany = (profiles || []).filter((p) => {
    const r = (p.role || '').toLowerCase().trim();
    return r === 'representative' && (!p.company_id || !companyMap.has(p.company_id));
  });
  console.log(`Encontrados: ${linkedWithoutValidCompany.length}`);
  linkedWithoutValidCompany.forEach((p) => {
    issueCount++;
    console.log(`  ⚠️ Usuário [representative] ${p.email} com company_id inválido/nulo: ${p.company_id}`);
  });

  console.log('\n--- 3. AUDITORIA: ADMIN DE DISTRIBUIDORA SEM DISTRIBUIDORA VÁLIDA ---');
  const adminWithoutCompany = (profiles || []).filter((p) => {
    const r = (p.role || '').toLowerCase().trim();
    return (r === 'admin_company' || r === 'company_admin') && (!p.company_id || !companyMap.has(p.company_id));
  });
  console.log(`Encontrados: ${adminWithoutCompany.length}`);
  adminWithoutCompany.forEach((p) => {
    issueCount++;
    console.log(`  ⚠️ Usuário [${p.role}] ${p.email} sem distribuidora válida: ${p.company_id}`);
  });

  console.log('\n--- 4. AUDITORIA: DISTRIBUIDORAS SEM PACOTE COMERCIAL (order_management_mode) ---');
  const companiesWithoutMode = (companies || []).filter((c) => !c.order_management_mode);
  console.log(`Encontrados: ${companiesWithoutMode.length}`);
  companiesWithoutMode.forEach((c) => {
    issueCount++;
    console.log(`  ⚠️ Distribuidora ${c.name} (${c.slug}) com order_management_mode: NULL`);
  });

  console.log('\n--- 5. AUDITORIA: MEMBERSHIPS RESIDUAIS DE AUTÔNOMOS EM DISTRIBUIDORAS ---');
  const residualMemberships = (memberships || []).filter((m) => {
    const p = profileMap.get(m.user_id);
    const org = orgMap.get(m.organization_id);
    if (!p || !org) return false;
    const r = (p.role || '').toLowerCase().trim();
    return (r === 'rep' || r === 'user' || r === 'master') && org.organization_type === 'distributor';
  });
  console.log(`Encontrados: ${residualMemberships.length}`);
  residualMemberships.forEach((m) => {
    issueCount++;
    const p = profileMap.get(m.user_id);
    const org = orgMap.get(m.organization_id);
    console.log(`  ⚠️ Usuário ${p?.email} ([${p?.role}]) possui membership ativa na distribuidora: ${org?.name}`);
  });

  console.log('\n--- 6. AUDITORIA: PEDIDOS COM DISTRIBUIDORA DIVERGENTE DO VENDEDOR ---');
  const mismatchedOrders = (orders || []).filter((ord) => {
    const sellerId = ord.seller_id || ord.user_id;
    if (!sellerId || !ord.company_id) return false;
    const seller = profileMap.get(sellerId);
    return seller && seller.company_id && seller.company_id !== ord.company_id;
  });
  console.log(`Encontrados: ${mismatchedOrders.length}`);
  mismatchedOrders.forEach((ord) => {
    const seller = profileMap.get(ord.seller_id || ord.user_id);
    console.log(`  ⚠️ Pedido ${ord.display_id || ord.id}: company_id do pedido (${ord.company_id}) != vendedor (${seller?.email} -> ${seller?.company_id})`);
  });

  console.log('\n====================================================');
  console.log(`TOTAL DE INCONSISTÊNCIAS: ${issueCount}`);
  console.log('====================================================\n');

  console.log('--- RECENT PROFILES (TOP 10) ---');
  profiles.slice(0, 10).forEach((p) => {
    console.log(`- [${p.role}] ${p.email} | company_id: ${p.company_id || 'NULL'} | can_manage_catalog: ${p.can_manage_catalog} | org_id: ${p.organization_id || 'NULL'}`);
  });

  console.log('\n--- DISTRIBUIDORAS CADASTRADAS ---');
  companies.forEach((c) => {
    const isActive = c.is_active !== undefined ? c.is_active : (c.metadata?.is_active ?? !c.block_new_orders);
    console.log(`- [${isActive ? 'ATIVA' : 'DESATIVADA'}] ${c.name} (${c.slug}) | Modelo: ${c.order_management_mode || 'NULL'}`);
  });

  return { issueCount, autonomousWithCompany, companiesWithoutMode, residualMemberships };
}

main().catch(console.error);
