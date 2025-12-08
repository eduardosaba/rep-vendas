import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { ProductsTable } from '@/components/dashboard/ProductsTable';
import { DiagnosticPanel } from '@/components/products/diagnostic-panel'; // Ajuste o import se necessário (named vs default)
import { 
  FileSpreadsheet, 
  Image as ImageIcon, 
  DollarSign, 
  Plus 
} from 'lucide-react';

// 🚀 OBRIGA O NEXT.JS A NÃO FAZER CACHE DESTA PÁGINA (Dados sempre frescos)
export const dynamic = 'force-dynamic';

export default async function ProductsPage() {
  const ensureSupabaseEnv = () => {
    if (
      !process.env.NEXT_PUBLIC_SUPABASE_URL ||
      !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    ) {
      // eslint-disable-next-line no-console
      console.error(
        'Faltam variáveis de ambiente Supabase: NEXT_PUBLIC_SUPABASE_URL ou NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
      throw new Error(
        'Configuração inválida: verifique NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY'
      );
    }
  };

  ensureSupabaseEnv();
  const supabase = await createClient();

  // 1. Autenticação Segura (Server-Side)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  // 2. Busca de Produtos (Server-Side)
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro ao carregar produtos:', error);
    return <ProductsTable initialProducts={[]} />;
  }

  // 3. Renderiza o Cliente com Header de Ações e Tabela
  return (
    <div className="p-6 space-y-6 pb-20">
      
      {/* Painel de Diagnóstico (Imagens pendentes) */}
      <DiagnosticPanel />

      {/* HEADER DE AÇÕES: Responsivo */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        
        {/* Título */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Produtos</h1>
          <p className="text-sm text-gray-500">
            Gerencie seu catálogo completo ({products?.length || 0} itens)
          </p>
        </div>

        {/* Barra de Ferramentas */}
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          
          {/* Botão Importar Excel */}
          <Link 
            href="/dashboard/products/import-massa" 
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
          >
            <FileSpreadsheet size={16} />
            <span className="whitespace-nowrap">Importar Excel</span>
          </Link>

          {/* Botão Importar Visual */}
          <Link 
            href="/dashboard/products/import-visual" 
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:text-primary hover:border-primary/30 transition-all shadow-sm"
          >
            <ImageIcon size={16} />
            <span className="whitespace-nowrap">Importar Fotos</span>
          </Link>

          {/* Botão Atualizar Preços (NOVO) */}
          <Link 
            href="/dashboard/products/update-prices" 
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 hover:text-green-600 hover:border-green-200 transition-all shadow-sm"
          >
            <DollarSign size={16} />
            <span className="whitespace-nowrap">Atualizar Preços</span>
          </Link>

          {/* Botão Novo Produto (Destaque) */}
          {/* Este botão pode abrir um modal ou ir para uma página de criação manual */}
          <button className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary text-primary-foreground text-sm font-medium rounded-lg hover:opacity-90 shadow-sm transition-all">
            <Plus size={16} />
            <span className="whitespace-nowrap">Novo Produto</span>
          </button>

        </div>
      </div>

      {/* Tabela de Dados */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <ProductsTable initialProducts={products || []} />
      </div>
    </div>
  );
}