import fs from 'fs';
import path from 'path';

describe('Local Integration Governance V1: SQL Migration Syntax & Security Matrix', () => {
  const migrationPath = path.join(process.cwd(), 'supabase/migrations/20260908000000_user_deactivation_and_governance.sql');
  let sqlContent: string;

  beforeAll(() => {
    sqlContent = fs.readFileSync(migrationPath, 'utf8');
  });

  it('valida que a migration de governança V1 é uma transação atômica encerrada com COMMIT', () => {
    expect(sqlContent.includes('BEGIN;')).toBe(true);
    expect(sqlContent.trim().endsWith('COMMIT;')).toBe(true);
  });

  it('valida que adiciona somente as colunas V1 em profiles (is_active, disabled_at, disabled_by, disabled_reason)', () => {
    expect(sqlContent).toContain('is_active BOOLEAN NOT NULL DEFAULT true');
    expect(sqlContent).toContain('disabled_at TIMESTAMPTZ NULL');
    expect(sqlContent).toContain('disabled_by UUID NULL REFERENCES public.profiles(id)');
    expect(sqlContent).toContain('disabled_reason TEXT NULL');
    expect(sqlContent).not.toContain('anonymized_at');
    expect(sqlContent).not.toContain('user_hard_delete_audit');
  });

  it('garante criação de única função auxiliar public.is_current_user_active() SECURITY DEFINER', () => {
    expect(sqlContent).toContain('CREATE OR REPLACE FUNCTION public.is_current_user_active()');
    expect(sqlContent).not.toContain('CREATE OR REPLACE FUNCTION public.is_master_active()');
    expect(sqlContent).not.toContain('CREATE OR REPLACE FUNCTION public.is_org_member_active()');
    expect(sqlContent).toContain('SECURITY DEFINER');
    expect(sqlContent).toContain('SET search_path = public, pg_temp');
  });

  it('garante revogação estrita de privilégios da RPC deactivate_user_safe (PUBLIC, anon, authenticated) e concessão para service_role', () => {
    expect(sqlContent).toContain('REVOKE ALL ON FUNCTION public.deactivate_user_safe(UUID, UUID, TEXT) FROM PUBLIC, anon, authenticated;');
    expect(sqlContent).toContain('GRANT EXECUTE ON FUNCTION public.deactivate_user_safe(UUID, UUID, TEXT) TO service_role;');
  });

  it('valida trava atômica FOR UPDATE e verificação de ROW_COUNT na RPC deactivate_user_safe usando o papel canônico master', () => {
    expect(sqlContent).toContain("PERFORM id FROM public.profiles WHERE role::text = 'master' AND is_active = true FOR UPDATE;");
    expect(sqlContent).toContain('SELECT COUNT(*) INTO v_active_master_count');
    expect(sqlContent).toContain("IF v_target_role = 'master' THEN");
    expect(sqlContent).toContain('IF v_active_master_count <= 1 THEN');
    expect(sqlContent).toContain('GET DIAGNOSTICS v_rows_updated = ROW_COUNT;');
  });

  it('valida a aplicação de RESTRICTIVE POLICIES diretas sem SQL dinâmico nas 11 tabelas privadas confirmadas e proteções de profiles', () => {
    const requiredPrivateRestrictivePolicies = [
      'Profiles_Active_User_Update_Restrictive',
      'Profiles_No_Delete_Restrictive',
      'Orders_Active_User_Restrictive',
      'Order_Items_Active_User_Restrictive',
      'Clients_Active_User_Restrictive',
      'Saved_Carts_Active_User_Restrictive',
      'Draft_Orders_Active_User_Restrictive',
      'Draft_Order_Items_Active_User_Restrictive',
      'Settings_Active_User_Restrictive',
      'User_Preferences_Active_User_Restrictive',
      'Organization_Members_Active_User_Restrictive',
      'Payment_Gateways_Active_User_Restrictive',
      'Subscriptions_Active_User_Restrictive',
    ];

    requiredPrivateRestrictivePolicies.forEach((policy) => {
      expect(sqlContent).toContain(policy);
    });

    expect(sqlContent).toContain('AS RESTRICTIVE');
    expect(sqlContent).toContain('USING (public.is_current_user_active())');

    // Valida que Profiles tem política explícita bloqueando DELETE para authenticated com USING (false)
    expect(sqlContent).toContain('CREATE POLICY "Profiles_No_Delete_Restrictive"');
    expect(sqlContent).toContain('FOR DELETE');
    expect(sqlContent).toContain('USING (false)');

    // Valida que UPDATE em Profiles exige usuário ativo
    expect(sqlContent).toContain('CREATE POLICY "Profiles_Active_User_Update_Restrictive"');
    expect(sqlContent).toContain('FOR UPDATE');

    // Não altera catálogo público (products/categories)
    expect(sqlContent).not.toContain('Products_Active_User_Restrictive');
    expect(sqlContent).not.toContain('Categories_Active_User_Restrictive');
  });
});
