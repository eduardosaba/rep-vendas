import { redirect } from 'next/navigation';

export default function ProductRedirect({
  params,
}: {
  params: { slug: string };
}) {
  const slug = encodeURIComponent(params.slug || '');
  // Redireciona para a home com query param `open` para abrir o modal via Storefront
  redirect(`/?open=${slug}`);
}
