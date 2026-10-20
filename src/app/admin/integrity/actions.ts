'use server';

import { createClient } from '@/lib/supabase/server';
import { supabaseAdmin } from '@/infrastructure/supabase/admin';
import { createAuditLog } from '@/lib/audit-service';
import { revalidatePath } from 'next/cache';
import { syncUserOrganizationContext } from '@/app/admin/users/actions';

export type IntegrityIssue = {
  id: string;
  type:
    | 'rep_with_company'
    | 'linked_rep_without_company'
    | 'admin_company_without_company'
    | 'company_without_mode'
    | 'inconsistent_membership'
    | 'order_mismatched_company';
  severity: 'high' | 'medium' | 'low';
  description: string;
  entityId: string;
  details: Record<string, any>;
};

export type IntegrityReport = {
  timestamp: string;
  healthy: boolean;
  totalIssuesCount: number;
  stats: {
    totalProfiles: number;
    totalCompanies: number;
    totalOrganizations: number;
    totalOrders: number;
  };
  issues: IntegrityIssue[];
};

export async function runIntegrityAudit(): Promise<{ success: boolean; data?: IntegrityReport; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Não autenticado' };
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'master') {
      return { success: false, error: 'Apenas usuários Master podem executar a auditoria de integridade.' };
    }

    const issues: IntegrityIssue[] = [];

    // 1. Carregar dados essenciais para cruzamento
    const [
      { data: profiles, error: pErr },
      { data: companies, error: cErr },
      { data: organizations, error: oErr },
      { data: memberships, error: mErr },
      { data: recentOrders, error: ordErr },
    ] = await Promise.all([
      (supabaseAdmin as any).from('profiles').select('id, email, full_name, role, company_id, organization_id'),
      (supabaseAdmin as any).from('companies').select('id, name, slug, order_management_mode, block_new_orders, metadata'),
      (supabaseAdmin as any).from('organizations').select('id, name, slug, organization_type, owner_user_id, metadata'),
      (supabaseAdmin as any).from('organization_members').select('organization_id, user_id, role, status'),
      (supabaseAdmin as any).from('orders').select('id, display_id, company_id, user_id, seller_id').order('created_at', { ascending: false }).limit(200),
    ]);

    if (pErr || cErr || oErr || mErr) {
      return { success: false, error: 'Falha ao consultar tabelas para auditoria.' };
    }

    const companyMap = new Map<string, any>((companies || []).map((c: any) => [c.id, c]));
    const orgMap = new Map<string, any>((organizations || []).map((o: any) => [o.id, o]));
    const profileMap = new Map<string, any>((profiles || []).map((p: any) => [p.id, p]));

    // 2. AUDITORIA: Representantes autônomos com company_id preenchido
    (profiles || []).forEach((p: any) => {
      const cleanRole = (p.role || '').toLowerCase().trim();
      if ((cleanRole === 'rep' || cleanRole === 'user') && p.company_id) {
        issues.push({
          id: `rep_with_company_${p.id}`,
          type: 'rep_with_company',
          severity: 'high',
          description: `Representante autônomo possui vínculo indevido com distribuidora (ID: ${p.company_id}).`,
          entityId: p.id,
          details: {
            email: p.email,
            role: p.role,
            company_id: p.company_id,
            company_name: companyMap.get(p.company_id)?.name || 'Empresa Inexistente',
          },
        });
      }
    });

    // 3. AUDITORIA: Representantes vinculados sem distribuidora ou com ID inexistente
    (profiles || []).forEach((p: any) => {
      const cleanRole = (p.role || '').toLowerCase().trim();
      if (cleanRole === 'representative') {
        if (!p.company_id) {
          issues.push({
            id: `linked_rep_without_company_${p.id}`,
            type: 'linked_rep_without_company',
            severity: 'high',
            description: `Representante com perfil vinculado não possui distribuidora definida.`,
            entityId: p.id,
            details: { email: p.email, role: p.role },
          });
        } else if (!companyMap.has(p.company_id)) {
          issues.push({
            id: `linked_rep_invalid_company_${p.id}`,
            type: 'linked_rep_without_company',
            severity: 'high',
            description: `Representante vinculado aponta para distribuidora inexistente no banco (${p.company_id}).`,
            entityId: p.id,
            details: { email: p.email, role: p.role, invalid_company_id: p.company_id },
          });
        }
      }
    });

    // 4. AUDITORIA: Admin de distribuidora sem distribuidora
    (profiles || []).forEach((p: any) => {
      const cleanRole = (p.role || '').toLowerCase().trim();
      if (cleanRole === 'admin_company' || cleanRole === 'company_admin') {
        if (!p.company_id || !companyMap.has(p.company_id)) {
          issues.push({
            id: `admin_company_without_company_${p.id}`,
            type: 'admin_company_without_company',
            severity: 'high',
            description: `Administrador de distribuidora sem empresa pai válida configurada.`,
            entityId: p.id,
            details: { email: p.email, role: p.role, company_id: p.company_id },
          });
        }
      }
    });

    // 5. AUDITORIA: Distribuidoras sem modelo de gestão definido (order_management_mode NULL)
    (companies || []).forEach((c: any) => {
      if (!c.order_management_mode) {
        issues.push({
          id: `company_without_mode_${c.id}`,
          type: 'company_without_mode',
          severity: 'medium',
          description: `Distribuidora sem pacote/modelo comercial definido (Catálogo Digital ou B2B Completo).`,
          entityId: c.id,
          details: { name: c.name, slug: c.slug },
        });
      }
    });

    // 6. AUDITORIA: Inconsistência de Memberships (ex: usuário autônomo com membership em distribuidora)
    (memberships || []).forEach((m: any) => {
      const p = profileMap.get(m.user_id);
      const org = orgMap.get(m.organization_id);
      if (p && org) {
        const cleanRole = (p.role || '').toLowerCase().trim();
        if ((cleanRole === 'rep' || cleanRole === 'user' || cleanRole === 'master') && org.organization_type === 'distributor') {
          issues.push({
            id: `inconsistent_membership_${m.organization_id}_${m.user_id}`,
            type: 'inconsistent_membership',
            severity: 'medium',
            description: `Usuário com perfil autônomo (${p.email}) possui membership residual ativa na distribuidora ${org.name}.`,
            entityId: `${m.organization_id}_${m.user_id}`,
            details: {
              userId: p.id,
              email: p.email,
              orgId: org.id,
              orgName: org.name,
              membershipRole: m.role,
            },
          });
        }
      }
    });

    // 7. AUDITORIA: Pedidos recentes com divergência entre empresa do pedido e empresa do vendedor
    (recentOrders || []).forEach((ord: any) => {
      const sellerId = ord.seller_id || ord.user_id;
      if (sellerId && ord.company_id) {
        const seller = profileMap.get(sellerId);
        if (seller && seller.company_id && seller.company_id !== ord.company_id) {
          issues.push({
            id: `order_mismatched_company_${ord.id}`,
            type: 'order_mismatched_company',
            severity: 'low',
            description: `Pedido ${ord.display_id || ord.id} registrado com empresa diferente da distribuidora atual do vendedor.`,
            entityId: ord.id,
            details: {
              orderId: ord.id,
              displayId: ord.display_id,
              orderCompanyId: ord.company_id,
              sellerEmail: seller.email,
              sellerCompanyId: seller.company_id,
            },
          });
        }
      }
    });

    const report: IntegrityReport = {
      timestamp: new Date().toISOString(),
      healthy: issues.length === 0,
      totalIssuesCount: issues.length,
      stats: {
        totalProfiles: profiles?.length || 0,
        totalCompanies: companies?.length || 0,
        totalOrganizations: organizations?.length || 0,
        totalOrders: recentOrders?.length || 0,
      },
      issues,
    };

    return { success: true, data: report };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}

export async function repairIntegrityIssues(targetType?: string): Promise<{ success: boolean; message?: string; repairedCount?: number; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return { success: false, error: 'Não autenticado' };

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'master') {
      return { success: false, error: 'Apenas usuários Master podem reparar inconsistências de integridade.' };
    }

    let repaired = 0;

    // 1. Corrigir representantes autônomos com company_id
    if (!targetType || targetType === 'rep_with_company') {
      const { data: badReps } = await (supabaseAdmin as any)
        .from('profiles')
        .select('id, email, full_name, role')
        .in('role', ['rep', 'user'])
        .not('company_id', 'is', null);

      if (badReps && badReps.length > 0) {
        for (const r of badReps) {
          await (supabaseAdmin as any)
            .from('profiles')
            .update({ company_id: null, can_manage_catalog: true, updated_at: new Date().toISOString() })
            .eq('id', r.id);

          try {
            await (supabaseAdmin.auth.admin as any).updateUserById(r.id, {
              user_metadata: { role: 'rep', company_id: null },
            });
          } catch {}

          await syncUserOrganizationContext({
            userId: r.id,
            role: 'rep',
            companyId: null,
            email: r.email,
            fullName: r.full_name,
          });

          repaired++;
        }
      }
    }

    // 2. Corrigir distribuidoras sem order_management_mode
    if (!targetType || targetType === 'company_without_mode') {
      const { data: badCompanies } = await (supabaseAdmin as any)
        .from('companies')
        .select('id, name')
        .is('order_management_mode', null);

      if (badCompanies && badCompanies.length > 0) {
        for (const c of badCompanies) {
          await (supabaseAdmin as any)
            .from('companies')
            .update({ order_management_mode: 'representative', updated_at: new Date().toISOString() })
            .eq('id', c.id);
          repaired++;
        }
      }
    }

    // 3. Corrigir memberships residuais em distribuidoras para quem é autônomo
    if (!targetType || targetType === 'inconsistent_membership') {
      const { data: repProfiles } = await (supabaseAdmin as any)
        .from('profiles')
        .select('id')
        .in('role', ['rep', 'user', 'master']);

      const repIds = (repProfiles || []).map((p: any) => p.id);

      if (repIds.length > 0) {
        const { data: badMemberships } = await (supabaseAdmin as any)
          .from('organization_members')
          .select('organization_id, user_id, organizations(organization_type)')
          .in('user_id', repIds);

        for (const m of badMemberships || []) {
          const orgType = (m.organizations as any)?.organization_type;
          if (orgType === 'distributor') {
            await (supabaseAdmin as any)
              .from('organization_members')
              .delete()
              .eq('organization_id', m.organization_id)
              .eq('user_id', m.user_id);
            repaired++;
          }
        }
      }
    }

    await createAuditLog(
      'repair_integrity_issues',
      `Auditoria de integridade multi-tenant executou ${repaired} correção(ões).`,
      { targetType: targetType || 'all', repairedCount: repaired }
    );

    revalidatePath('/admin/companies');
    revalidatePath('/admin/users');

    return {
      success: true,
      repairedCount: repaired,
      message: `${repaired} inconsistência(s) de integridade multi-tenant corrigida(s) com sucesso!`,
    };
  } catch (error: any) {
    return { success: false, error: error?.message || String(error) };
  }
}
