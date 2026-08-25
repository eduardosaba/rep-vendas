import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function backfillProductsOrganizationId() {
  console.log('Iniciando backfill de products.organization_id...');

  // 1. Via organization_members
  console.log('Passo 1: Atualizando via organization_members...');
  const { data: members, error: membersError } = await supabase
    .from('organization_members')
    .select('user_id, organization_id')
    .eq('status', 'active')
    .in('role', ['owner', 'admin', 'sales_rep']);

  if (membersError) {
    console.error('Erro ao buscar memberships:', membersError);
    return;
  }

  let updatedCount = 0;
  for (const member of members || []) {
    const { error, count } = await supabase
      .from('products')
      .update({ organization_id: member.organization_id })
      .eq('user_id', member.user_id)
      .is('organization_id', null);

    if (error) {
      console.error(`Erro ao atualizar products para user ${member.user_id}:`, error);
    } else if (count && count > 0) {
      updatedCount += count;
      console.log(`  Atualizados ${count} products para org ${member.organization_id} (user ${member.user_id})`);
    }
  }

  // 2. Via profile.organization_id
  console.log('Passo 2: Atualizando via profile.organization_id...');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, organization_id')
    .not('organization_id', 'is', null);

  if (profilesError) {
    console.error('Erro ao buscar profiles:', profilesError);
  } else {
    for (const profile of profiles || []) {
      const { error, count } = await supabase
        .from('products')
        .update({ organization_id: profile.organization_id })
        .eq('user_id', profile.id)
        .is('organization_id', null);

      if (error) {
        console.error(`Erro ao atualizar products para user ${profile.id}:`, error);
      } else if (count && count > 0) {
        updatedCount += count;
        console.log(`  Atualizados ${count} products para org ${profile.organization_id} (user ${profile.id})`);
      }
    }
  }

  // 3. Via profile.company_id (legacy)
  console.log('Passo 3: Atualizando via profile.company_id (legacy)...');
  const { data: legacyProfiles, error: legacyError } = await supabase
    .from('profiles')
    .select('id, company_id')
    .not('company_id', 'is', null);

  if (legacyError) {
    console.error('Erro ao buscar legacy profiles:', legacyError);
  } else {
    for (const profile of legacyProfiles || []) {
      const { error, count } = await supabase
        .from('products')
        .update({ organization_id: profile.company_id })
        .eq('user_id', profile.id)
        .is('organization_id', null);

      if (error) {
        console.error(`Erro ao atualizar products para user ${profile.id}:`, error);
      } else if (count && count > 0) {
        updatedCount += count;
        console.log(`  Atualizados ${count} products para org ${profile.company_id} (user ${profile.id})`);
      }
    }
  }

  console.log(`\n✅ Backfill concluído! Total de products atualizados: ${updatedCount}`);

  // Verificar produtos ainda órfãos
  const { count: orphanCount } = await supabase
    .from('products')
    .select('*', { count: 'exact', head: true })
    .is('organization_id', null);

  if (orphanCount && orphanCount > 0) {
    console.log(`⚠️  Ainda existem ${orphanCount} products sem organization_id (órfãos)`);
  }
}

async function backfillBrandsOrganizationId() {
  console.log('\nIniciando backfill de brands.organization_id...');

  const { data: members } = await supabase
    .from('organization_members')
    .select('user_id, organization_id')
    .eq('status', 'active');

  let updatedCount = 0;
  for (const member of members || []) {
    const { error, count } = await supabase
      .from('brands')
      .update({ organization_id: member.organization_id })
      .eq('user_id', member.user_id)
      .is('organization_id', null);

    if (error) {
      console.error(`Erro ao atualizar brands para user ${member.user_id}:`, error);
    } else if (count && count > 0) {
      updatedCount += count;
    }
  }

  // Via profile
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, organization_id, company_id')
    .not('organization_id', 'is', null);

  for (const profile of profiles || []) {
    const { error, count } = await supabase
      .from('brands')
      .update({ organization_id: profile.organization_id })
      .eq('user_id', profile.id)
      .is('organization_id', null);

    if (error) {
      console.error(`Erro ao atualizar brands para user ${profile.id}:`, error);
    } else if (count && count > 0) {
      updatedCount += count;
    }
  }

  // Legacy company_id
  const { data: legacyProfiles } = await supabase
    .from('profiles')
    .select('id, company_id')
    .not('company_id', 'is', null);

  for (const profile of legacyProfiles || []) {
    const { error, count } = await supabase
      .from('brands')
      .update({ organization_id: profile.company_id })
      .eq('user_id', profile.id)
      .is('organization_id', null);

    if (error) {
      console.error(`Erro ao atualizar brands para user ${profile.id}:`, error);
    } else if (count && count > 0) {
      updatedCount += count;
    }
  }

  console.log(`✅ Backfill brands concluído! Total atualizados: ${updatedCount}`);
}

async function backfillCategoriesOrganizationId() {
  console.log('\nIniciando backfill de categories.organization_id...');

  const { data: members } = await supabase
    .from('organization_members')
    .select('user_id, organization_id')
    .eq('status', 'active');

  let updatedCount = 0;
  for (const member of members || []) {
    const { error, count } = await supabase
      .from('categories')
      .update({ organization_id: member.organization_id })
      .eq('user_id', member.user_id)
      .is('organization_id', null);

    if (error) {
      console.error(`Erro ao atualizar categories para user ${member.user_id}:`, error);
    } else if (count && count > 0) {
      updatedCount += count;
    }
  }

  // Via profile
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, organization_id, company_id')
    .not('organization_id', 'is', null);

  for (const profile of profiles || []) {
    const { error, count } = await supabase
      .from('categories')
      .update({ organization_id: profile.organization_id })
      .eq('user_id', profile.id)
      .is('organization_id', null);

    if (error) {
      console.error(`Erro ao atualizar categories para user ${profile.id}:`, error);
    } else if (count && count > 0) {
      updatedCount += count;
    }
  }

  // Legacy company_id
  const { data: legacyProfiles } = await supabase
    .from('profiles')
    .select('id, company_id')
    .not('company_id', 'is', null);

  for (const profile of legacyProfiles || []) {
    const { error, count } = await supabase
      .from('categories')
      .update({ organization_id: profile.company_id })
      .eq('user_id', profile.id)
      .is('organization_id', null);

    if (error) {
      console.error(`Erro ao atualizar categories para user ${profile.id}:`, error);
    } else if (count && count > 0) {
      updatedCount += count;
    }
  }

  console.log(`✅ Backfill categories concluído! Total atualizados: ${updatedCount}`);
}

async function main() {
  console.log('=== BACKFILL ORGANIZATION_ID - FASE 2 ===\n');

  await backfillProductsOrganizationId();
  await backfillBrandsOrganizationId();
  await backfillCategoriesOrganizationId();

  console.log('\n=== BACKFILL COMPLETO ===');
}

main().catch(console.error);