import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

type CompanyInsert = {
  name: string;
  slug: string;
  cnpj: string;
  metadata: {
    environment: string;
    demo: boolean;
    createdBy: string;
  };
};

type SettingsInsert = {
  company_id: string;
  fiscal_mode: string;
  auto_create_invoice_on_picking_completed: boolean;
  auto_create_shipment_on_invoice_issued: boolean;
};

export async function createDemoOrganization(supabaseAdmin: any) {
  const companyName = 'Distribuidora Alpha';
  const companySlug = 'alpha-demo';

  const { data: existingCompany } = await supabaseAdmin
    .from('companies')
    .select('id')
    .eq('slug', companySlug)
    .maybeSingle();

  if (existingCompany) {
    return { success: false, error: 'A Distribuidora Demo já existe no sistema.', company: null };
  }

  // Criar a empresa com o marcador metadata e settings manuais
  const { data: company, error: companyError } = await supabaseAdmin
    .from('companies')
    .insert({
      name: companyName,
      slug: companySlug,
      cnpj: '00.000.000/0001-00',
      metadata: {
        environment: 'development',
        demo: true,
        createdBy: 'dev-setup',
      }
    } satisfies CompanyInsert as any)
    .select()
    .single();

  if (companyError || !company) throw new Error(companyError?.message || 'Falha ao criar empresa');

  // Ajustar settings (fiscal_mode manual, automações desligadas)
  await supabaseAdmin.from('settings').insert({
    company_id: (company as any).id,
    fiscal_mode: 'manual',
    auto_create_invoice_on_picking_completed: false,
    auto_create_shipment_on_invoice_issued: false
  } satisfies SettingsInsert as any);

  return { success: true, company };
}