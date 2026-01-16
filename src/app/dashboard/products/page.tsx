import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getActiveUserId } from '@/lib/auth-utils';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
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
// SyncProgressBanner removido — banner não exibido nesta página

// 🚀 OBRIGA O NEXT.JS A NÃO FAZER CACHE DESTA PÁGINA
export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const supabase = await createClient();

  // 1. Respeita impersonation (se houver) e retorna o user_id ativo
  const activeUserId = await getActiveUserId();
  if (!activeUserId) {
    try {
      const fb = await getServerUserFallback();
      if (!fb) return redirect('/login');
    } catch (e) {
      return redirect('/login');
    }
  }

  // 2. Busca de Produtos Otimizada
  // Selecionamos apenas o necessário para a lista inicial para não pesar
  // Busca limite do plano para retornar até esse número de produtos
  let maxLimit = 5000; // fallback aumentado para 5000
  try {
    const { data: sub } = await supabase
      .from('subscriptions')
      .select('plan_id, plan_name')
      .eq('user_id', activeUserId)
      .maybeSingle();

    if (sub?.plan_id) {
      const { data: plan } = await supabase
        .from('plans')
        .select('product_limit, max_products')
        .eq('id', sub.plan_id)
        .maybeSingle();

      if (plan) {
        maxLimit = plan.product_limit || plan.max_products || maxLimit;
        console.log(
          '[ProductsPage] Limite do plano:',
          maxLimit,
          'Plano:',
          sub.plan_id
        );
      }
    } else if (sub?.plan_name) {
      const { data: plan } = await supabase
        .from('plans')
        .select('product_limit, max_products')
        .eq('name', sub.plan_name)
        .maybeSingle();

      if (plan) {
        maxLimit = plan.product_limit || plan.max_products || maxLimit;
        console.log(
          '[ProductsPage] Limite do plano:',
          maxLimit,
          'Plano:',
          sub.plan_name
        );
      }
    }
  } catch (e) {
    console.error('Erro ao recuperar limite do plano:', e);
  }

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', activeUserId)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao carregar produtos:', error);
  }

  // Fallback seguro se der erro
  const safeProducts = products || [];

  // Estatísticas de otimização de imagens
  const totalProducts = safeProducts.length;
  const productsWithInternalImages = safeProducts.filter(
    (p) => p.image_path
  ).length;
  const productsWithExternalImages = safeProducts.filter(
    (p) => !p.image_path && (p.image_url || p.external_image_url || p.images)
  ).length;
  const optimizationRate =
    totalProducts > 0
      ? Math.round((productsWithInternalImages / totalProducts) * 100)
      : 0;

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

          <Link
            href={`/api/export/products/xlsx?userId=${activeUserId}`}
            className="contents"
          >
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto justify-center"
              leftIcon={<FileSpreadsheet size={16} />}
            >
              Exportar Excel
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

      {/* Estatísticas de Otimização de Imagens */}
      {totalProducts > 0 && (
        <div className="bg-gradient-to-br from-orange-50 to-yellow-50 dark:from-orange-950/20 dark:to-yellow-950/20 rounded-xl border border-orange-200 dark:border-orange-800 p-5">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-orange-500 rounded-xl">
              <ImageIcon size={24} className="text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                Status de Otimização de Imagens
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Imagens Otimizadas
                  </p>
                  <p className="text-2xl font-black text-green-600 dark:text-green-400">
                    {productsWithInternalImages}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ✅ Armazenadas no Supabase
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Imagens Externas
                  </p>
                  <p className="text-2xl font-black text-orange-600 dark:text-orange-400">
                    {productsWithExternalImages}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    ⚠️ Não otimizadas (mais lentas)
                  </p>
                </div>
                <div className="bg-white dark:bg-slate-800 rounded-lg p-3 border border-gray-200 dark:border-slate-700">
                  <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase mb-1">
                    Taxa de Otimização
                  </p>
                  <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                    {optimizationRate}%
                  </p>
                  <div className="mt-2 w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
                      style={{ width: `${optimizationRate}%` }}
                    />
                  </div>
                </div>
              </div>
              {productsWithExternalImages > 0 && (
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-700 dark:text-gray-300">
                    💡 <strong>{productsWithExternalImages} produtos</strong>{' '}
                    podem ser otimizados para melhorar a performance do
                    catálogo.
                  </span>
                  <Link
                    href="/dashboard/manage-external-images"
                    className="contents"
                  >
                    <Button
                      variant="primary"
                      size="sm"
                      className="whitespace-nowrap"
                    >
                      Otimizar Agora
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Painel de Diagnóstico (Só exibe se houver problemas) */}
      {/* <DiagnosticPanel /> */}

      {/* Tabela de Dados */}
      {/* Envolvemos em um container com borda e fundo para o tema */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
        {/* Passamos os dados para o Client Component que vai cuidar da responsividade da tabela */}
        <ProductsTable initialProducts={safeProducts} />
      </div>
    </div>
  );
}
