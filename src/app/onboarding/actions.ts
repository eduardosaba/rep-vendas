'use server';

import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { syncPublicCatalog } from '@/lib/sync-public-catalog';
import { revalidatePath } from 'next/cache';
import { SlugService } from '@/shared/slug/SlugService';

export type Step1Data = {
  fullName: string;
  phone: string;
  email: string;
};

export type Step2Data = {
  companyName: string;
  organizationType: 'independent_representative' | 'distributor' | 'optical_store';
  phone?: string;
  email?: string;
  isManualClient?: boolean;
};

export type Step3Data = {
  storeName: string;
  slug: string;
  primaryColor: string;
  logoUrl?: string | null;
  phone?: string;
  email?: string;
  fullName?: string;
};

async function getAuthenticatedUser(supabase: any) {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('Sessão expirada. Por favor, faça login novamente.');
  }
  return user;
}

/**
 * ETAPA 1 — Seus Dados (Persiste Perfil Pessoal e Settings de Contato)
 */
export async function saveOnboardingStep1(data: Step1Data) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);
  const adminDb = createAdminClient();

  const { normalizePhone } = await import('@/lib/phone');
  const safePhone = normalizePhone(data.phone);
  const safeName = (data.fullName || '').trim();
  const safeEmail = (data.email || '').trim().toLowerCase();

  // 1. Atualiza Perfil usando adminDb (imune a restrições de RLS no onboarding)
  const { error } = await adminDb
    .from('profiles')
    .update({
      full_name: safeName || undefined,
      phone: safePhone || undefined,
      whatsapp: safePhone || undefined,
      email: safeEmail || undefined,
      onboarding_step: 2,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    throw new Error(`Erro ao salvar dados pessoais: ${error.message}`);
  }

  // 2. Sincroniza desde já com tabela settings
  try {
    await adminDb.from('settings').upsert(
      {
        user_id: user.id,
        name: safeName || undefined,
        phone: safePhone || undefined,
        email: safeEmail || undefined,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
  } catch (settErr) {
    console.warn('[saveOnboardingStep1] Aviso ao atualizar settings:', settErr);
  }

  return { success: true, nextStep: 2 };
}

/**
 * ETAPA 2 — Seu Negócio (Criação/Vinculação Idempotente da Organização Comercial)
 */
export async function saveOnboardingStep2(data: Step2Data) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);
  const adminDb = createAdminClient();

  // 1. Obter Perfil Atual para checar se já possui organization_id e papel pré-existente
  const { data: profile, error: profileErr } = await adminDb
    .from('profiles')
    .select('organization_id, company_id, role, full_name, phone, email')
    .eq('id', user.id)
    .single();

  if (profileErr) {
    throw new Error(`Erro ao carregar perfil: ${profileErr.message}`);
  }

  let organizationId = profile?.organization_id;

  // 2. Se o perfil não tem organization_id, busca se já existe uma organização com owner_user_id = user.id
  if (!organizationId) {
    const { data: existingOrg } = await adminDb
      .from('organizations')
      .select('id')
      .eq('owner_user_id', user.id)
      .maybeSingle();

    if (existingOrg) {
      organizationId = existingOrg.id;
    }
  }

  const safeCompanyName = (data.companyName || '').trim() || profile?.full_name || 'Minha Empresa';
  const safeOrgType = ['independent_representative', 'distributor', 'optical_store'].includes(data.organizationType)
    ? data.organizationType
    : 'independent_representative';

  let safeOrgSlug = '';
  // 3. Se nenhuma organização foi encontrada, criar uma nova organização de forma idempotente
  if (!organizationId) {
    const baseSlug = SlugService.generate(safeCompanyName) || `org-${user.id.slice(0, 8)}`;
    safeOrgSlug = await SlugService.ensureUnique(baseSlug, async (candidate) => {
      const { data: orgCheck } = await adminDb
        .from('organizations')
        .select('id')
        .eq('slug', candidate)
        .maybeSingle();
      return Boolean(orgCheck);
    });

    const { data: newOrg, error: createOrgErr } = await adminDb
      .from('organizations')
      .insert({
        name: safeCompanyName,
        slug: safeOrgSlug,
        organization_type: safeOrgType,
        owner_user_id: user.id,
        status: 'active',
        is_active: true,
      })
      .select('id')
      .single();

    if (createOrgErr || !newOrg) {
      throw new Error(`Erro ao criar empresa/organização: ${createOrgErr?.message || 'Falha ao registrar'}`);
    }

    organizationId = newOrg.id;
  } else {
    // Atualizar nome e tipo da organização existente sem recriar
    await adminDb
      .from('organizations')
      .update({
        name: safeCompanyName,
        organization_type: safeOrgType,
        updated_at: new Date().toISOString(),
      })
      .eq('id', organizationId);
  }

  // 4. Garantir Membership Owner em organization_members
  const { error: memberErr } = await adminDb
    .from('organization_members')
    .upsert(
      {
        organization_id: organizationId,
        user_id: user.id,
        role: 'owner',
        status: 'active',
      },
      { onConflict: 'organization_id,user_id' }
    );

  if (memberErr) {
    console.warn('[saveOnboardingStep2] Aviso ao inserir membership:', memberErr.message);
  }

  // 5. Se for Distribuidora, registra na tabela companies (apenas para distribuidoras!)
  if (safeOrgType === 'distributor') {
    try {
      await adminDb.from('companies').upsert(
        {
          id: organizationId,
          user_id: user.id,
          name: safeCompanyName,
          slug: safeOrgSlug || `company-${organizationId.slice(0, 8)}`,
          type: 'distribuidora',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch (compErr) {
      console.warn('[saveOnboardingStep2] Aviso ao sincronizar tabela companies:', compErr);
    }
  }

  // 6. Atualizar profiles preservando configurações prévias para clientes manuais
  const targetRole =
    safeOrgType === 'distributor'
      ? 'admin_company'
      : safeOrgType === 'optical_store'
      ? 'optical_client'
      : 'rep';

  const updateProfilePayload: any = {
    organization_id: organizationId,
    onboarding_step: 3,
    updated_at: new Date().toISOString(),
  };

  // Se não for cliente manual (usuário em teste), define role e categoria escolhidas
  if (!data.isManualClient) {
    updateProfilePayload.role = targetRole;
    updateProfilePayload.user_category = safeOrgType;
  }

  // ATENÇÃO ARQUITETURAL: company_id é EXCLUSIVO de distribuidoras ou membros da distribuidora.
  // Representantes independentes NUNCA devem ter company_id!
  if (safeOrgType === 'distributor') {
    updateProfilePayload.company_id = organizationId;
  }

  const { error: updateProfileErr } = await adminDb
    .from('profiles')
    .update(updateProfilePayload)
    .eq('id', user.id);

  if (updateProfileErr) {
    throw new Error(`Erro ao vincular organização ao perfil: ${updateProfileErr.message}`);
  }

  return { success: true, organizationId, nextStep: 3 };
}

/**
 * ETAPA 3 — Seu Catálogo (Configuração da Presença Comercial e Branding)
 */
export async function saveOnboardingStep3(data: Step3Data) {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);
  const adminDb = createAdminClient();

  const safeStoreName = (data.storeName || '').trim() || 'Minha Loja Digital';
  const rawSlug = (data.slug || '').trim() || SlugService.generate(safeStoreName);

  // Garantir Slug Única checando tanto settings quanto public_catalogs
  const safeSlug = await SlugService.ensureUnique(rawSlug, async (candidate) => {
    const [{ data: existingSettings }, { data: existingPub }] = await Promise.all([
      adminDb
        .from('settings')
        .select('user_id')
        .eq('catalog_slug', candidate)
        .maybeSingle(),
      adminDb
        .from('public_catalogs')
        .select('user_id')
        .eq('catalog_slug', candidate)
        .maybeSingle(),
    ]);

    const settingsTaken = Boolean(existingSettings && existingSettings.user_id !== user.id);
    const pubTaken = Boolean(existingPub && existingPub.user_id !== user.id);
    return settingsTaken || pubTaken;
  });

  const { data: profile } = await adminDb
    .from('profiles')
    .select('phone, email, organization_id, company_id, role, full_name')
    .eq('id', user.id)
    .single();

  const { normalizePhone } = await import('@/lib/phone');
  const safePhone = normalizePhone(data.phone || profile?.phone || '');
  const safeEmail = (data.email || profile?.email || user.email || '').trim().toLowerCase();

  // 1. Upsert em Settings com slug, phone, email, nome e branding
  const { error: settingsError } = await adminDb.from('settings').upsert(
    {
      user_id: user.id,
      name: safeStoreName,
      email: safeEmail || null,
      phone: safePhone || null,
      catalog_slug: safeSlug,
      primary_color: data.primaryColor || '#b9722e',
      logo_url: data.logoUrl || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (settingsError) {
    throw new Error(`Falha ao salvar configurações da loja: ${settingsError.message}`);
  }

  // 2. Sincronizar profiles.slug, phone, whatsapp, email
  const { error: profileError } = await adminDb
    .from('profiles')
    .update({
      slug: safeSlug,
      phone: safePhone || undefined,
      whatsapp: safePhone || undefined,
      email: safeEmail || undefined,
      onboarding_step: 4,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (profileError) {
    console.warn('[saveOnboardingStep3] Erro ao atualizar slug no perfil:', profileError.message);
  }

  // 3. Se houver organização vinculada, atualizar o slug e nome da organização
  if (profile?.organization_id) {
    await adminDb
      .from('organizations')
      .update({
        slug: safeSlug,
        name: safeStoreName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.organization_id);
  }

  // 4. Se houver empresa (companies) vinculada no perfil (apenas distribuidora), atualizar
  if (profile?.company_id && (profile?.role === 'admin_company' || profile?.role === 'distributor')) {
    await adminDb
      .from('companies')
      .update({
        slug: safeSlug,
        name: safeStoreName,
        updated_at: new Date().toISOString(),
      })
      .eq('id', profile.company_id);
  }

  // 5. Sincronizar com catálogo público (public_catalogs)
  await syncPublicCatalog(user.id, {
    slug: safeSlug,
    store_name: safeStoreName,
    logo_url: data.logoUrl || undefined,
    primary_color: data.primaryColor || '#b9722e',
    phone: safePhone,
    email: safeEmail,
    is_active: true,
  });

  return { success: true, slug: safeSlug, nextStep: 4 };
}

/**
 * ETAPA 4 — Conclusão do Onboarding (Marca Concluído e Ativa Lead)
 */
export async function finishOnboarding() {
  const supabase = await createClient();
  const user = await getAuthenticatedUser(supabase);
  const adminDb = createAdminClient();

  const nowIso = new Date().toISOString();

  // 1. Marcar onboarding como concluído em profiles
  const { error: profileError } = await adminDb
    .from('profiles')
    .update({
      onboarding_completed: true,
      onboarding_completed_at: nowIso,
      onboarding_step: 4,
      updated_at: nowIso,
    })
    .eq('id', user.id);

  if (profileError) {
    throw new Error(`Erro ao atualizar status do perfil: ${profileError.message}`);
  }

  // 2. Atualizar status do lead para 'activated' se houver um lead associado ao user_id
  try {
    await adminDb
      .from('leads')
      .update({
        status: 'activated',
        updated_at: nowIso,
      })
      .eq('user_id', user.id);
  } catch (leadErr) {
    console.warn('[finishOnboarding] Aviso ao atualizar lead:', leadErr);
  }

  // 3. Revalidar rotas no Next.js
  revalidatePath('/', 'layout');
  revalidatePath('/dashboard', 'page');
  revalidatePath('/onboarding', 'page');

  return { success: true, redirectTo: '/dashboard' };
}
