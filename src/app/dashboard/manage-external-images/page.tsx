import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server'; // Caminho padronizado
import ManageExternalImagesClient from '@/components/dashboard/ManageExternalImagesClient';
import { CloudDownload, ArrowLeft, CheckCircle2 } from 'lucide-react';

export const metadata = {
  title: 'Sincronizar Imagens | Rep-Vendas',
  description: 'Baixe e armazene imagens de links externos automaticamente.',
};

export const dynamic = 'force-dynamic';

export default async function ManageExternalImagesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // Busca produtos que:
  // 1. Pertencem ao usuário
  // 2. Têm URL externa (não nula e não vazia)
  // 3. NÃO têm imagem interna salva (image_url é null)
  const { data, error } = await supabase
    .from('products')
    .select('id, name, reference_code, external_image_url')
    .eq('user_id', user.id)
    .is('image_url', null)
    .not('external_image_url', 'is', null)
    .neq('external_image_url', '')
    .order('id', { ascending: true });

  if (error) {
    console.error('Erro ao buscar produtos:', error);
  }

  const products = data || [];

  return (
    <div className="flex flex-col h-[calc(100vh-1rem)] bg-gray-50 dark:bg-slate-950 p-4 md:p-6 overflow-hidden">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl shadow-sm">
            <CloudDownload size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Sincronizar Imagens
              </h1>
              <span className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300 text-xs font-bold px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                {products.length} pendentes
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Baixe imagens de links externos (Excel) para o servidor.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/products"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        >
          <ArrowLeft size={16} />
          Voltar para Produtos
        </Link>
      </div>

      {/* ÁREA PRINCIPAL */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col relative">
        {products.length > 0 ? (
          <ManageExternalImagesClient initialProducts={products} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center p-8">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/20 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2
                className="text-green-600 dark:text-green-400"
                size={32}
              />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
              Tudo Atualizado!
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md">
              Não há produtos com links externos pendentes de download.
            </p>
            <Link
              href="/dashboard/products"
              className="mt-6 px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium"
            >
              Voltar ao Catálogo
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
