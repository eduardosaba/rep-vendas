import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';

export async function createDemoOrganization(supabaseAdmin: ReturnType<typeof createSupabaseAdmin>) {
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
    })
    .select()
    .single();

  if (companyError || !company) throw new Error(companyError?.message || 'Falha ao criar empresa');

  // Ajustar settings (fiscal_mode manual, automações desligadas)
  await supabaseAdmin.from('settings').insert({
    company_id: company.id,
    fiscal_mode: 'manual',
    auto_create_invoice_on_picking_completed: false,
    auto_create_shipment_on_invoice_issued: false
  });

  return { success: true, company };
}
