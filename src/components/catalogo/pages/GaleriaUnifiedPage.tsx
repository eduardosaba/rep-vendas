'use server';

import React from 'react';
import { createClient as createSupabaseAdmin } from '@supabase/supabase-js';
import { resolveContext } from '@/lib/resolve-context';

const supabaseAdmin = createSupabaseAdmin(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

export default async function Page({
  params,
}: {
  params: Promise<any>;
}) {
  const resolved = await params;
  const slug = Array.isArray(resolved?.slug)
    ? resolved.slug
    : resolved?.slug
      ? [resolved.slug]
      : resolved?.companySlug && resolved?.repSlug
        ? [resolved.companySlug, resolved.repSlug]
        : [];

  const context = await resolveContext(slug, supabaseAdmin as any);
  if (!context) return <div className="p-6">Catálogo não encontrado.</div>;

  let company = context.company;
  if (!company && context.representative?.company_id) {
    const { data } = await supabaseAdmin
      .from('companies')
      .select('id,name')
      .eq('id', context.representative.company_id)
      .maybeSingle();
    company = data;
  }

  if (!company) {
    return <div className="p-6">Galeria indisponível para este catálogo.</div>;
  }

  const { data: images, error } = await supabaseAdmin.from('company_gallery').select('*').eq('company_id', company.id).order('order_index', { ascending: true }).limit(200);
  if (error) return <div className="p-6">Erro carregando galeria: {error.message}</div>;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-semibold mb-4">Galeria — {company.name}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(images || []).map((img: any) => (
          <div key={img.id} className="rounded-2xl overflow-hidden bg-white shadow-sm">
            <img src={img.image_url} alt={img.title || ''} className="w-full h-48 object-cover" />
            <div className="p-2">
              <h4 className="font-bold text-sm truncate">{img.title}</h4>
              {img.description ? <p className="text-xs text-gray-500">{img.description}</p> : null}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
