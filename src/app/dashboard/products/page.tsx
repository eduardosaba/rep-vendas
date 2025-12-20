import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ProductsTable } from '@/components/dashboard/ProductsTable';
import { DiagnosticPanel } from '@/components/products/diagnostic-panel';
import {
  FileSpreadsheet,
  Image as ImageIcon,
  DollarSign,
  Plus,
  Box,
} from 'lucide-react';
import { Button } from '@/components/ui/Button'; // Usando nosso componente padronizado

// 🚀 OBRIGA O NEXT.JS A NÃO FAZER CACHE DESTA PÁGINA
export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const supabase = await createClient();

  // 1. Autenticação Segura (Server-Side)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Busca de Produtos Otimizada
  // Selecionamos apenas o necessário para a lista inicial para não pesar
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao carregar produtos:', error);
  }

  // Fallback seguro se der erro
  const safeProducts = products || [];

  return (
    <div className="p-4 md:p-6 space-y-6 pb-24 animate-in fade-in duration-500">
      {/* HEADER DE AÇÕES: Responsivo */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        {/* Título */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Box size={24} className="text-[var(--primary)]" />
            Produtos
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Gerencie seu catálogo completo ({safeProducts.length} itens)
          </p>
        </div>

        {/* Barra de Ferramentas */}
        <div className="grid grid-cols-2 sm:flex flex-wrap gap-3 w-full lg:w-auto">
          {/* Botão Importar Excel */}
          <Link href="/dashboard/products/import-massa" className="contents">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto justify-center"
              leftIcon={<FileSpreadsheet size={16} />}
            >
              Importar Excel
            </Button>
          </Link>

          {/* Botão Importar Visual */}
          <Link href="/dashboard/products/import-visual" className="contents">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto justify-center"
              leftIcon={<ImageIcon size={16} />}
            >
              Importar Fotos
            </Button>
          </Link>

          {/* Botão Atualizar Preços */}
          <Link href="/dashboard/products/update-prices" className="contents">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto justify-center col-span-2 sm:col-span-1"
              leftIcon={<DollarSign size={16} />}
            >
              Atualizar Preços
            </Button>
          </Link>

          {/* Botão Novo Produto (Destaque) */}
          <Link href="/dashboard/products/new" className="contents">
            <Button
              variant="primary"
              size="sm"
              className="w-full sm:w-auto justify-center col-span-2 sm:col-span-1"
              leftIcon={<Plus size={16} />}
            >
              Novo Produto
            </Button>
          </Link>
        </div>
      </div>

      {/* Painel de Diagnóstico (Só exibe se houver problemas) */}
      <DiagnosticPanel />

      {/* Tabela de Dados */}
      {/* Envolvemos em um container com borda e fundo para o tema */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
        {/* Passamos os dados para o Client Component que vai cuidar da responsividade da tabela */}
        <ProductsTable initialProducts={safeProducts} />
      </div>
    </div>
  );
}
