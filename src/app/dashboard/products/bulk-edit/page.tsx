import React from 'react';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import BulkEditClient from '@/components/dashboard/BulkEditClient';
import { Table, ArrowLeft, AlertCircle, Package } from 'lucide-react';

export const metadata = {
  title: 'Tabela de Produtos | Rep-Vendas',
  description: 'Visualização e edição de produtos em formato de tabela.',
};

export const dynamic = 'force-dynamic';

export default async function BulkEditPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // CORREÇÃO: Adicionado 'user_id' na seleção
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, user_id, name, reference_code, price, sale_price, brand, stock_quantity'
    )
    .eq('user_id', user.id)
    .order('name', { ascending: true });

  if (error) {
    console.error('Erro ao buscar produtos:', error);
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] text-red-600 gap-2">
        <AlertCircle size={32} />
        <h2 className="text-lg font-bold">Erro ao carregar dados</h2>
        <p className="text-sm text-gray-500">{error.message}</p>
        <Link
          href="/dashboard/products"
          className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
        >
          Voltar para Lista
        </Link>
      </div>
    );
  }

  const products = data || [];

  return (
    <div className="flex flex-col h-[calc(100vh-1rem)] bg-gray-50 dark:bg-slate-950 p-4 md:p-6 overflow-hidden">
      {/* HEADER DA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl shadow-sm">
            <Table size={24} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                Tabela de Produtos
              </h1>
              <span className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300 text-xs font-bold px-2 py-0.5 rounded-full border border-blue-200 dark:border-blue-800">
                {products.length} itens
              </span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Gerencie seu catálogo em formato de planilha.
            </p>
          </div>
        </div>

        <Link
          href="/dashboard/products"
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
        >
          <ArrowLeft size={16} />
          Voltar
        </Link>
      </div>

      <div className="flex-1 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col relative">
        {products.length > 0 ? (
          <BulkEditClient initialProducts={products} />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Package size={48} className="mb-4 opacity-20" />
            <p>Você ainda não tem produtos cadastrados.</p>
            <Link
              href="/dashboard/products/new"
              className="text-blue-600 hover:underline mt-2"
            >
              Cadastrar primeiro produto
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
