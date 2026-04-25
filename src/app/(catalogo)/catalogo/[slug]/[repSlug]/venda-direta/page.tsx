import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveContext } from '@/lib/resolve-context';
import CheckoutForm from '@/app/catalogo/checkout/CheckoutForm.client';

export const dynamic = 'force-dynamic';

type SearchParams = Record<string, string | string[] | undefined>;

export default async function DirectSalePage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string; repSlug: string }>;
  searchParams?: Promise<SearchParams>;
}) {
  const resolvedParams = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const supabase = await createClient();
  const context = await resolveContext([resolvedParams.slug, resolvedParams.repSlug], supabase as any);

  if (!context || context.type !== 'distributor' || !context.company?.id || !context.representative?.id) {
    return notFound();
  }

  const customerParam = Array.isArray(resolvedSearchParams?.customer_id)
    ? resolvedSearchParams?.customer_id[0]
    : resolvedSearchParams?.customer_id;

  const legacyCustomerParam = Array.isArray(resolvedSearchParams?.customer)
    ? resolvedSearchParams?.customer[0]
    : resolvedSearchParams?.customer;

  const linkedCustomerId = customerParam || legacyCustomerParam || null;

  const { data: themeSettings } = await supabase
    .from('company_settings')
    .select('primary_color,secondary_color,accent_color,font_family,border_radius')
    .eq('company_id', context.company.id)
    .maybeSingle();

  let initialCustomer: {
    id: string;
    name?: string | null;
    phone?: string | null;
    email?: string | null;
    document?: string | null;
  } | null = null;

  if (linkedCustomerId) {
    const { data: customer } = await supabase
      .from('customers')
      .select('id, name, phone, email, document')
      .eq('id', linkedCustomerId)
      .eq('company_id', context.company.id)
      .maybeSingle();

    initialCustomer = customer || null;
  }
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="mx-auto w-full max-w-2xl rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <h1 className="text-2xl font-bold text-slate-900">Venda Direta</h1>
        <p className="mt-1 text-sm text-slate-500">
          Fechamento consultivo no contexto de {context.company.name} com {context.representative.full_name || context.representative.slug}.
        </p>

        <div className="mt-6">
          <CheckoutForm
            companyId={context.company.id}
            repId={context.representative.id}
            repSlug={context.representative.slug || context.repSlug}
            initialTheme={themeSettings || null}
            initialRep={context.representative}
            checkoutBlocked={Boolean(context.company.block_new_orders)}
            initialCustomerId={initialCustomer?.id || linkedCustomerId}
            initialCustomer={initialCustomer}
            isDirectSale
            companyBrand={{
              id: context.company.id,
              name: context.company.name,
              logo_url: context.company.logo_url,
              slug: context.company.slug,
            }}
          />
        </div>
      </div>
    </div>
  );
}
