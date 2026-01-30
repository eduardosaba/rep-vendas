import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getActiveUserId } from '@/lib/auth-utils';
import ManageExternalImagesClient from '@/components/dashboard/ManageExternalImagesClient';
import {
  CloudDownload,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export const metadata = {
  title: 'Sincronizar Imagens | Rep-Vendas',
  description: 'Internalização automática de mídias para o Storage.',
};

export const dynamic = 'force-dynamic';

export default async function ManageExternalImagesPage() {
  const supabase = await createClient();
  const activeUserId = await getActiveUserId();
  if (!activeUserId) redirect('/login');

  // Restrict access to master admin only
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const MASTER_EMAIL =
    process.env.MASTER_ADMIN_EMAIL || process.env.MASTER_EMAIL;
  if (!user || (MASTER_EMAIL && user.email !== MASTER_EMAIL)) {
    // Redirect non-master users back to products dashboard
    return redirect('/dashboard');
  }

  // 1. BUSCA OTIMIZADA: Trazemos apenas o necessário para a análise
  const { data: products, error } = await supabase
    .from('products')
    .select('id, name, reference_code, brand, image_url, images, image_path')
    .eq('user_id', activeUserId);

  if (error) console.error('Erro ao buscar produtos:', error);

  const storageMarker = '.supabase.co/storage';

  // 2. LÓGICA DE FILTRAGEM REFORMULADA
  const pendingProducts = (products || [])
    .filter((p: any) => {
      const isMainExternal =
        p.image_url && !p.image_url.includes(storageMarker);

      const hasArrayExternal =
        Array.isArray(p.images) &&
        p.images.some((img: any) => {
          const url = typeof img === 'string' ? img : img?.url;
          return url && !url.includes(storageMarker);
        });

      return !p.image_path || isMainExternal || hasArrayExternal;
    })
    .map((p) => ({
      id: p.id,
      name: p.name || 'Sem nome',
      reference_code: p.reference_code,
      brand: p.brand,
      category: null,
      external_image_url:
        p.image_url && !p.image_url.includes(storageMarker)
          ? p.image_url
          : Array.isArray(p.images)
            ? p.images[0]?.url || p.images[0]
            : null,
    }));

  return (
    <div className="flex flex-col h-screen bg-slate-50 dark:bg-slate-950 p-6 overflow-hidden">
      {/* HEADER PREMIUM */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8 shrink-0">
        <div className="flex items-center gap-4">
          <div className="p-4 bg-indigo-600 text-white rounded-2xl shadow-lg shadow-indigo-200 dark:shadow-none">
            <CloudDownload size={28} />
          </div>
          <div>
            <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">
              Central de Mídia
            </h1>
            <p className="text-slate-500 font-medium">
              Converta links externos em arquivos seguros no seu Storage.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/products"
          className="flex items-center gap-2 px-6 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 transition-all shadow-sm"
        >
          <ArrowLeft size={18} />
          Painel de Produtos
        </Link>
      </div>

      {/* ALERT BOX PARA EXPLICAR O PROCESSO */}
      {pendingProducts.length > 0 && (
        <div className="mb-6 p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertCircle className="text-amber-600" size={20} />
          <p className="text-sm text-amber-800 font-medium">
            <strong>Dica:</strong> Para evitar bloqueios de segurança (CORS), o
            download é processado pelo nosso servidor em lotes. Mantenha esta
            aba aberta até a conclusão.
          </p>
        </div>
      )}

      {/* ÁREA DE CONTEÚDO */}
      <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col overflow-hidden">
        <div className="flex-1 overflow-auto p-2">
          {pendingProducts.length > 0 ? (
            <ManageExternalImagesClient initialProducts={pendingProducts} />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/20 rounded-full flex items-center justify-center mb-6">
                <CheckCircle2
                  className="text-emerald-600 dark:text-emerald-400"
                  size={48}
                />
              </div>
              <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">
                Catálogo 100% Protegido!
              </h3>
              <p className="text-slate-500 max-w-sm font-medium">
                Todas as suas imagens já estão hospedadas no servidor oficial.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
