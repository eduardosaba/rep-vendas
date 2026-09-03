import ExportTriggerButton from '@/components/dashboard/ExportTriggerButton';
import { ProductsTable } from '@/components/dashboard/ProductsTableV2';
import { Button } from '@/components/ui/button'; // Usando nosso componente padronizado
import { getActiveUserId } from '@/lib/auth-utils';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import { createClient } from '@/lib/supabase/server';
import {
  Box,
  DollarSign,
  FileSpreadsheet,
  Image as ImageIcon,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { redirect } from 'next/navigation';

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
        </div>

        {/* Barra de Ferramentas */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:flex gap-3 w-full lg:w-auto">
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

          {/* Botão Sincronizar Imagens */}
          <Link href="/dashboard/settings/sync" className="contents">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto justify-center border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20"
              leftIcon={<RefreshCw size={16} />}
            >
              Sincronizar Imagens
            </Button>
          </Link>

          <ExportTriggerButton userId={activeUserId} />

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
        </div>
      </div>
      {/* Tabela de Dados - Nova versão client-side com API */}
      <ProductsTable />
    </div>
  );
}
