'use server';

import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { resolveContext } from '@/lib/resolve-context';

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<any>;
  // Next.js passes searchParams as an object of query params
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  // Normaliza os parâmetros para o resolvedor único de contexto de catálogo.
  const slug = Array.isArray(resolved?.slug)
    ? resolved.slug
    : resolved?.slug
      ? [resolved.slug]
      : resolved?.companySlug && resolved?.repSlug
        ? [resolved.companySlug, resolved.repSlug]
        : [];
  const supabase = await createClient();
  const context = await resolveContext(slug, supabase as any);

  if (!context) return notFound();

  // Accept ?customer=... or ?customer_id=...
  const customerQuery = Array.isArray(resolvedSearchParams?.customer)
    ? resolvedSearchParams?.customer[0]
    : (resolvedSearchParams?.customer as string | undefined);
  const customerIdQuery = Array.isArray(resolvedSearchParams?.customer_id)
    ? resolvedSearchParams?.customer_id[0]
    : (resolvedSearchParams?.customer_id as string | undefined);

  const linkedCustomerId = customerIdQuery || customerQuery || null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-100">
      <div className="w-full max-w-md rounded-lg bg-white p-8 shadow-lg">
        <h1 className="mb-4 text-center text-2xl font-bold">Checkout</h1>
        <p className="mb-1 text-center text-gray-600">Contexto: {context.type === 'distributor' ? 'Distribuidora' : 'Individual'}</p>
        <p className="mb-4 text-center text-gray-500 text-sm">Rota base: {context.pathPrefix}</p>
        {linkedCustomerId ? (
          <div className="p-4 mb-4 rounded border border-blue-100 bg-blue-50 text-blue-800">
            Checkout vinculado ao cliente <strong>{linkedCustomerId}</strong>. Campos do cliente estarão bloqueados.
          </div>
        ) : (
          <p className="text-center text-green-600">✅ Rota do checkout está funcionando!</p>
        )}
      </div>
    </div>
  );
}
