'use client';

import { useState, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Image as ImageIcon,
  Loader2,
  UploadCloud,
  RefreshCcw,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

interface Product {
  id: string;
  name: string;
  reference_code: string;
  price: number;
  brand: string | null;
  image_url: string | null;
  images: string[] | null;
  created_at: string;
  slug?: string | null;
}

export default function ProductsClient({
  initialProducts,
  initialUserId,
}: {
  initialProducts: Product[];
  initialUserId: string;
}) {
  const router = useRouter();
  // usando sonner diretamente
  const [products, setProducts] = useState<Product[]>(initialProducts || []);
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const refresh = async () => {
    try {
      setLoading(true);
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Sessão ausente', { description: 'Faça login novamente.' });
        return;
      }

      // Fetch up to 5000 items to avoid default 1000-row cap from PostgREST
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .range(0, 4999);

      if (error) throw error;
      setProducts(data || []);
      toast.success('Lista atualizada');
    } catch (err: any) {
      toast.error('Erro ao atualizar', {
        description: err.message || String(err),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;

      setProducts((prev) => prev.filter((p) => p.id !== id));
      toast.success('Produto excluído');
    } catch (error: any) {
      toast.error('Erro ao excluir', {
        description: error.message || String(error),
      });
    }
  };

  const filteredProducts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(term) ||
        (product.reference_code &&
          product.reference_code.toLowerCase().includes(term))
    );
  }, [products, searchTerm]);

  return (
    <div className="space-y-6 pb-20">
      {/* Cabeçalho */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Meus Produtos</h1>
          <p className="text-sm text-gray-500">
            Gerencie o seu catálogo ({products.length} itens)
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={refresh}
            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg border border-gray-200 transition-colors"
            title="Recarregar Lista"
          >
            <RefreshCcw size={18} className={loading ? 'animate-spin' : ''} />
          </button>

          <Link
            href="/dashboard/products/new"
            className="flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition-all shadow-sm"
          >
            <Plus size={18} />
            Novo Produto
          </Link>

          <Link
            href="/dashboard/products/import-visual"
            className="flex items-center gap-2 rounded-lg border border-gray-300 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <UploadCloud size={18} />
            Importar
          </Link>
        </div>
      </div>

      {/* Barra de Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          placeholder="Buscar por nome ou referência..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full rounded-xl border border-gray-200 py-3 pl-10 pr-4 focus:border-[var(--primary)] focus:outline-none focus:ring-1 focus:ring-[var(--primary)] transition-all shadow-sm"
        />
      </div>

      {/* DESKTOP: Tabela de Produtos */}
      <div className="hidden md:block rounded-xl border border-gray-200 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="w-full overflow-x-auto shadow-sm border border-gray-100 rounded-lg">
          <table className="w-full text-left text-sm min-w-full">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200">
              <tr>
                <th className="px-3 sm:px-6 py-4 font-medium">Produto</th>
                <th className="px-3 sm:px-6 py-4 font-medium">Referência</th>
                <th className="px-3 sm:px-6 py-4 font-medium">Preço</th>
                <th className="px-3 sm:px-6 py-4 font-medium text-right">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <Loader2 className="animate-spin text-indigo-600 h-8 w-8" />
                      <span className="text-gray-500 text-sm">
                        Carregando...
                      </span>
                    </div>
                  </td>
                </tr>
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={4} className="p-12 text-center text-gray-500">
                    <div className="flex flex-col items-center justify-center max-w-md mx-auto">
                      <ImageIcon className="h-12 w-12 text-gray-300 mb-3" />
                      <p className="text-lg font-medium text-gray-900">
                        Nenhum produto encontrado
                      </p>
                      <p className="text-sm text-gray-500 mb-4">
                        {products.length === 0
                          ? 'Você ainda não cadastrou nenhum produto.'
                          : 'Nenhum produto corresponde à sua busca.'}
                      </p>
                      {initialUserId && (
                        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded text-left text-xs text-yellow-800 w-full">
                          <div className="flex items-center gap-2 font-bold mb-1">
                            <AlertTriangle size={14} /> Diagnóstico:
                          </div>
                          <p>
                            Os produtos no Supabase devem ter a coluna{' '}
                            <strong>user_id</strong> igual a:
                          </p>
                          <code className="block bg-yellow-100 p-1 mt-1 rounded font-mono break-all select-all">
                            {initialUserId}
                          </code>
                          <p className="mt-1">
                            Verifique na tabela <em>products</em> se os IDs
                            coincidem.
                          </p>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr
                    key={product.id}
                    className="hover:bg-gray-50 transition-colors group"
                  >
                    <td className="px-3 sm:px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg bg-gray-100 border border-gray-200 relative flex items-center justify-center">
                          {(() => {
                            const img =
                              (product as any).image_url ||
                              (product as any).external_image_url ||
                              null;
                            return img ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={img}
                                alt={product.name}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <ImageIcon size={16} className="text-gray-400" />
                            );
                          })()}
                        </div>
                        <span className="font-medium text-gray-900">
                          {product.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-gray-600 font-mono text-xs">
                      {product.reference_code || '-'}
                    </td>
                    <td className="px-3 sm:px-6 py-4 font-medium text-gray-900">
                      {new Intl.NumberFormat('pt-BR', {
                        style: 'currency',
                        currency: 'BRL',
                      }).format(product.price)}
                    </td>
                    <td className="px-3 sm:px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                        <Link
                          href={`/dashboard/products/${product.slug || product.id}`}
                          className="p-2 text-gray-400 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 size={18} />
                        </Link>
                        <button
                          onClick={() => handleDelete(product.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MOBILE: Cards de Produtos */}
      <div className="grid grid-cols-1 gap-4 md:hidden">
        {loading && products.length === 0 ? (
          <div className="p-12 text-center text-gray-500 bg-white dark:bg-slate-900 rounded-xl border border-gray-200">
            <div className="flex flex-col items-center gap-2">
              <Loader2 className="animate-spin text-indigo-600 h-8 w-8" />
              <span className="text-gray-500 text-sm">Carregando...</span>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="p-12 text-center text-gray-500 bg-white dark:bg-slate-900 rounded-xl border border-gray-200">
            <div className="flex flex-col items-center justify-center max-w-md mx-auto">
              <ImageIcon className="h-12 w-12 text-gray-300 mb-3" />
              <p className="text-lg font-medium text-gray-900">
                Nenhum produto encontrado
              </p>
              <p className="text-sm text-gray-500 mb-4">
                {products.length === 0
                  ? 'Você ainda não cadastrou nenhum produto.'
                  : 'Nenhum produto corresponde à sua busca.'}
              </p>
            </div>
          </div>
        ) : (
          filteredProducts.map((product) => (
            <div
              key={product.id}
              className="p-4 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-800 rounded-xl shadow-sm"
            >
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 border border-gray-100 flex items-center justify-center flex-shrink-0">
                  {(() => {
                    const img =
                      (product as any).image_url ||
                      (product as any).external_image_url ||
                      null;
                    return img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageIcon size={18} className="text-gray-400" />
                    );
                  })()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 dark:text-white truncate">
                    {product.name}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 font-mono truncate">
                    {product.reference_code || '-'}
                  </p>
                </div>
                <div className="ml-3 text-right">
                  <div className="text-sm text-gray-500">
                    {new Intl.NumberFormat('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }).format(product.price)}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Link
                      href={`/dashboard/products/${product.slug || product.id}`}
                      className="p-2 text-gray-400 hover:text-[var(--primary)] hover:bg-[var(--primary)]/10 rounded-lg transition-colors"
                    >
                      <Edit2 size={18} />
                    </Link>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
