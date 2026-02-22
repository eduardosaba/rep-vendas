import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { getActiveUserId } from '@/lib/auth-utils';
import { getServerUserFallback } from '@/lib/supabase/getServerUserFallback';
import { ProductsTable } from '@/components/dashboard/ProductsTable';
import {
  FileSpreadsheet,
  Image as ImageIcon,
  DollarSign,
  Plus,
  Box,
} from 'lucide-react';
import { Button } from '@/components/ui/button'; // Usando nosso componente padronizado
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
  let maxLimit = 5000; // fallback seguro para usuários comuns

  // 2.1 Verifica o cargo do usuário para definir o limite
  const { data: { user } = {} } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user?.id)
    .maybeSingle();

  const isAdmin = profile?.role === 'master' || profile?.role === 'admin';

  if (isAdmin) {
    maxLimit = 20000;
  } else {
    // Busca limite do plano para usuários comuns
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
          maxLimit = plan.product_limit || plan.max_products || 5000;
        }
      }
    } catch (e) {
      console.error('Erro ao recuperar limite do plano:', e);
    }
  }

  // debug visibility
  console.log(
    `[DEBUG] Usuário é Admin: ${isAdmin} | Limite definido: ${maxLimit}`
  );

  // 3. Query de Produtos com Range Explícito
  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .eq('user_id', activeUserId)
    .order('created_at', { ascending: false })
    .range(0, maxLimit);

  if (error) {
    console.error('Erro ao carregar produtos:', error);
  }

  // Fallback seguro se der erro
  const safeProducts = products || [];

  // Gera thumbnail 480w para listagem administrativa (evita carregar 1200w)
  const ensure480 = (u: string | null | undefined) => {
    if (!u) return '/placeholder.png';
    try {
      if (/-1200w(\.|$)/.test(u)) return u.replace(/-1200w(\.|$)/, '-480w$1');
      return u.replace(/(\.[a-z0-9]+)(\?|$)/i, '-480w$1');
    } catch (e) {
      return u;
    }
  };

  const withThumbnails = (safeProducts || []).map((p: any) => {
    try {
      // 1. Prioriza image_variants
      if (Array.isArray(p.image_variants) && p.image_variants.length > 0) {
        const v480 = p.image_variants.find((v: any) => v.size === 480);
        if (v480?.url) return { ...p, thumbnail: v480.url };
        const vAny = p.image_variants[0];
        if (vAny?.url) return { ...p, thumbnail: ensure480(vAny.url) };
      }

      // 2. Usa primeira imagem da galeria
      if (Array.isArray(p.gallery_images) && p.gallery_images.length > 0) {
        const first = p.gallery_images[0];
        if (first?.variants && Array.isArray(first.variants)) {
          const vv = first.variants.find((v: any) => v.size === 480);
          if (vv?.url) return { ...p, thumbnail: vv.url };
          if (first.variants[0]?.url) return { ...p, thumbnail: ensure480(first.variants[0].url) };
        }
        if (first?.url) return { ...p, thumbnail: ensure480(first.url) };
      }

      // 3. Fallback para image_url
      if (typeof p.image_url === 'string' && p.image_url) {
        return { ...p, thumbnail: ensure480(p.image_url) };
      }

      // 4. fallback final
      return { ...p, thumbnail: '/placeholder.png' };
    } catch (e) {
      return { ...p, thumbnail: '/placeholder.png' };
    }
  });

  // Mostrar painel de diagnóstico somente para usuários master/template
  const allowedDiagnosticEmails = [
    'eduardopedro.fsa@gmail.com',
    'template-otica@repvendas.com.br',
  ];
  const showDiagnosticPanel = Boolean(
    user && allowedDiagnosticEmails.includes(user.email || '')
  );

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

      {/* Estatísticas de Otimização de Imagens (comentado temporariamente)
          Renderização original condicional:
          {showDiagnosticPanel && totalProducts > 0 && ( ... )}
          O bloco foi comentado para não exibir o card enquanto não for necessário.
      */}

      {/* Painel de Diagnóstico desativado temporariamente */}

      {/* Tabela de Dados */}
      {/* Envolvemos em um container com borda e fundo para o tema */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm overflow-hidden min-h-[400px]">
        {/* Passamos os dados para o Client Component que vai cuidar da responsividade da tabela */}
        <ProductsTable initialProducts={withThumbnails} />
      </div>
    </div>
  );
}
