'use client';

import { ArrowUpDown, Check, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Copy, DollarSign, Edit2, Eye, EyeOff, FileText, Filter, Loader2, Plus, Search, SlidersHorizontal, Star, Tag, Trash2, X } from 'lucide-react';
import Image from 'next/image';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useOrganization } from '@/modules/organization-context/OrganizationProvider';
import { formatImageUrl } from '@/lib/imageUtils';
import { bulkUpdatePrice } from '@/app/dashboard/products/actions';

const ALL_COLUMNS = [
  { key: 'image_url', label: 'Imagem' },
  { key: 'reference_code', label: 'Ref.' },
  { key: 'name', label: 'Produto' },
  { key: 'brand', label: 'Marca' },
  { key: 'category', label: 'Categoria' },
  { key: 'price', label: 'Preço' },
  { key: 'sale_price', label: 'Promo' },
  { key: 'stock_quantity', label: 'Estoque' },
  { key: 'is_active', label: 'Status' },
  { key: 'is_launch', label: 'Lanç.' },
  { key: 'is_destaque', label: 'Destaque' },
];

interface Product {
  id: string;
  reference_code: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  brand_id: string | null;
  price: number | null;
  price_on_request?: boolean | null;
  sale_price: number | null;
  cost: number | null;
  image_url: string | null;
  images: string[] | null;
  user_id: string;
  organization_id: string | null;
  company_id: string | null;
  category_id: string | null;
  category: string | null;
  is_active: boolean;
  is_launch: boolean;
  is_destaque: boolean;
  is_best_seller: boolean;
  bestseller: boolean;
  track_stock: boolean;
  stock_quantity: number | null;
  min_stock_level: number | null;
  manage_stock: boolean;
  sku: string | null;
  barcode: string | null;
  color: string | null;
  material: string | null;
  fotocromatico: boolean | null;
  polarizado: boolean | null;
  material_haste: string | null;
  colecao: string | null;
  frame_formato: string | null;
  color_nome: string | null;
  tipo_montagem: string | null;
  gender: string | null;
  technical_specs: Record<string, any> | null;
  source_product_id: string | null;
  source_organization_id: string | null;
  cloned_at: string | null;
  cloned_by_user_id: string | null;
  created_at: string;
  updated_at: string | null;
  slug: string | null;
  discount_percent: number | null;
  original_price: number | null;
  external_image_url: string | null;
  image_path: string | null;
  short_id: string | null;
  last_import_id: string | null;
  sync_status: string | null;
  sync_error: string | null;
  image_is_shared: boolean | null;
  image_optimized: boolean | null;
}

interface PaginatedResponse {
  data: Product[];
  meta: {
    totalCount: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface ProductFilters {
  search?: string;
  brand_id?: string;
  category_id?: string;
  material?: string;
  fotocromatico?: boolean;
  polarizado?: boolean;
  is_active?: boolean;
  is_launch?: boolean;
  is_destaque?: boolean;
  min_price?: number;
  max_price?: number;
  in_stock?: boolean;
  sort_by?: string;
  sort_order?: string;
  page?: number;
  page_size?: number;
}

interface Brand {
  id: string;
  name: string;
  logo_url: string | null;
}

interface Category {
  id: string;
  name: string;
}

export function ProductsTable() {
  const { context, isLoading: orgLoading } = useOrganization();
  const [products, setProducts] = useState<Product[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<ProductFilters>({
    page: 1,
    page_size: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  });
  const [meta, setMeta] = useState<PaginatedResponse['meta']>({
    totalCount: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  });
  const [showFilters, setShowFilters] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectAllPages, setSelectAllPages] = useState(false);
  const [isBulkUpdating, setIsBulkUpdating] = useState(false);

  // Ref e evento para fechar Seletor de Colunas ao clicar fora
  const columnSelectorRef = useRef<HTMLDivElement>(null);
  const [showColumnSelector, setShowColumnSelector] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<Record<string, boolean>>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('products_visible_columns_v2');
      if (saved) {
        try { return JSON.parse(saved); } catch (_) {}
      }
    }
    return ALL_COLUMNS.reduce((acc, c) => ({ ...acc, [c.key]: true }), {});
  });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (columnSelectorRef.current && !columnSelectorRef.current.contains(event.target as Node)) {
        setShowColumnSelector(false);
      }
    };
    if (showColumnSelector) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showColumnSelector]);

  const toggleColumn = (key: string) => {
    setVisibleColumns(prev => {
      const updated = { ...prev, [key]: !prev[key] };
      if (typeof window !== 'undefined') {
        localStorage.setItem('products_visible_columns_v2', JSON.stringify(updated));
      }
      return updated;
    });
  };

  // Modal de Atualização de Preço
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [priceMode, setPriceMode] = useState<'fixed' | 'percentage'>('fixed');
  const [priceValue, setPriceValue] = useState<string>('');

  const getTargetIdsForBulk = async (): Promise<string[]> => {
    if (!selectAllPages) return selectedIds;
    // Se selectAllPages for verdadeiro, busca todos os IDs que batem com o filtro atual
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null && key !== 'page' && key !== 'page_size') {
          params.append(key, String(value));
        }
      });
      params.append('page', '1');
      params.append('limit', '10000');
      const response = await fetch(`/api/products?${params.toString()}`);
      if (response.ok) {
        const result = await response.json();
        return (result.data || []).map((p: any) => p.id);
      }
    } catch (e) {
      console.error('Erro ao carregar IDs de todas as páginas:', e);
    }
    return selectedIds;
  };

  const handleExecutePriceUpdate = async () => {
    const val = parseFloat(priceValue.replace(',', '.'));
    if (isNaN(val)) {
      toast.error('Informe um valor numérico válido.');
      return;
    }

    setIsBulkUpdating(true);
    try {
      const targetIds = await getTargetIdsForBulk();
      const res = await bulkUpdatePrice(targetIds, priceMode, val);
      if (res?.error) throw new Error(res.error);
      toast.success(`Preço atualizado com sucesso para ${targetIds.length} produto(s)!`);
      setShowPriceModal(false);
      setPriceValue('');
      setSelectedIds([]);
      setSelectAllPages(false);
      fetchProducts();
    } catch (err: any) {
      console.error('Erro ao atualizar preço em massa:', err);
      toast.error(err.message || 'Erro ao atualizar preços');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const organizationId = context?.organizationId;

  // Fetch products
  const fetchProducts = useCallback(async () => {
    if (!organizationId) return;
    
    setLoading(true);
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== '' && value !== null) {
          params.append(key, String(value));
        }
      });

      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao buscar produtos');
      }
      const result: PaginatedResponse = await response.json();
      setProducts(result.data);
      setMeta(result.meta);
    } catch (error) {
      console.error('Erro ao buscar produtos:', error);
      toast.error('Erro ao carregar produtos');
    } finally {
      setLoading(false);
    }
  }, [organizationId, filters]);

  // Fetch brands
  const fetchBrands = useCallback(async () => {
    if (!organizationId) return;
    try {
      const response = await fetch('/api/brands');
      if (response.ok) {
        const result = await response.json();
        setBrands(result.data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar marcas:', error);
    }
  }, [organizationId]);

  // Fetch categories
  const fetchCategories = useCallback(async () => {
    if (!organizationId) return;
    try {
      const response = await fetch('/api/categories');
      if (response.ok) {
        const result = await response.json();
        setCategories(result.data || []);
      }
    } catch (error) {
      console.error('Erro ao buscar categorias:', error);
    }
  }, [organizationId]);

  useEffect(() => {
    if (organizationId) {
      fetchProducts();
      fetchBrands();
      fetchCategories();
    }
  }, [organizationId, fetchProducts, fetchBrands, fetchCategories]);

  const handleFilterChange = (key: keyof ProductFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const handleSort = (sortBy: string) => {
    setFilters(prev => ({
      ...prev,
      sort_by: sortBy,
      sort_order: prev.sort_by === sortBy && prev.sort_order === 'asc' ? 'desc' : 'asc',
    }));
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;
    
    setDeletingId(id);
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erro ao excluir');
      }
      toast.success('Produto excluído com sucesso');
      fetchProducts();
    } catch (error) {
      console.error('Erro ao excluir:', error);
      toast.error('Erro ao excluir produto');
    } finally {
      setDeletingId(null);
    }
  };

  const handleToggleActive = async (product: Product) => {
    const newStatus = !product.is_active;
    setProducts(prev =>
      prev.map(p => (p.id === product.id ? { ...p, is_active: newStatus } : p))
    );
    try {
      const response = await fetch(`/api/products/${product.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: newStatus }),
      });
      if (!response.ok) throw new Error('Erro ao atualizar');
      toast.success(`Produto ${newStatus ? 'ativado' : 'desativado'} com sucesso`);
      fetchProducts();
    } catch (error) {
      setProducts(prev =>
        prev.map(p => (p.id === product.id ? { ...p, is_active: product.is_active } : p))
      );
      console.error('Erro ao alternar status:', error);
      toast.error('Erro ao atualizar produto');
    }
  };
  const handleSelectAll = () => {
    if (selectedIds.length === products.length || selectAllPages) {
      setSelectedIds([]);
      setSelectAllPages(false);
    } else {
      setSelectedIds(products.map(p => p.id));
      setSelectAllPages(false);
    }
  };

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleBulkUpdate = async (fields: Record<string, any>) => {
    if (selectedIds.length === 0) return;
    setIsBulkUpdating(true);
    try {
      const targetIds = await getTargetIdsForBulk();
      setProducts(prev =>
        prev.map(p => (targetIds.includes(p.id) ? { ...p, ...fields } : p))
      );

      const response = await fetch('/api/products/bulk-update', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: targetIds, updates: fields }),
      });

      if (!response.ok) {
        await Promise.all(
          targetIds.map(id =>
            fetch(`/api/products/${id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(fields),
            })
          )
        );
      }

      toast.success(`${targetIds.length} produto(s) atualizados com sucesso!`);
      setSelectedIds([]);
      setSelectAllPages(false);
      fetchProducts();
    } catch (err: any) {
      console.error('Erro ao atualizar em massa:', err);
      toast.error(err.message || 'Erro ao atualizar produtos em massa');
      fetchProducts();
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    const targetIds = await getTargetIdsForBulk();
    if (!confirm(`Tem certeza que deseja excluir os ${targetIds.length} produtos selecionados?`)) return;
    
    setIsBulkUpdating(true);
    try {
      await Promise.all(
        targetIds.map(id =>
          fetch(`/api/products/${id}`, {
            method: 'DELETE',
          })
        )
      );

      toast.success(`${targetIds.length} produto(s) excluídos com sucesso!`);
      setSelectedIds([]);
      setSelectAllPages(false);
      fetchProducts();
    } catch (err: any) {
      console.error('Erro ao excluir em massa:', err);
      toast.error('Erro ao excluir produtos selecionados');
    } finally {
      setIsBulkUpdating(false);
    }
  };

  const getSortIcon = (columnKey: string) => {
    if (filters.sort_by !== columnKey) return <ArrowUpDown className="w-4 h-4 text-gray-400" />;
    return filters.sort_order === 'asc' ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />;
  };

  const SortableHeader = ({ columnKey, title }: { columnKey: string; title: string }) => (
    <th
      onClick={() => handleSort(columnKey)}
      className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 select-none"
    >
      <div className="flex items-center gap-1">
        <span>{title}</span>
        {getSortIcon(columnKey)}
      </div>
    </th>
  );

  if (orgLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>Nenhuma organização selecionada</p>
        <p className="text-sm mt-1">Selecione uma organização no seletor do header</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            onClick={() => setShowFilters(!showFilters)}
            variant="outline"
            className={showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}
          >
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>

          {/* Seletor de Colunas */}
          <div className="relative" ref={columnSelectorRef}>
            <Button
              variant="outline"
              onClick={() => setShowColumnSelector(!showColumnSelector)}
              className={showColumnSelector ? 'bg-gray-100 dark:bg-gray-800 border-gray-300' : ''}
            >
              <SlidersHorizontal className="w-4 h-4 mr-2" />
              Colunas
            </Button>

            {showColumnSelector && (
              <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-3 z-50 animate-in fade-in zoom-in-95">
                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                  Exibir Colunas
                </div>
                <div className="space-y-1.5 max-h-60 overflow-y-auto">
                  {ALL_COLUMNS.map(col => (
                    <label key={col.key} className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-200 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 p-1.5 rounded transition-colors">
                      <input
                        type="checkbox"
                        checked={visibleColumns[col.key] !== false}
                        onChange={() => toggleColumn(col.key)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Button onClick={() => window.location.href = '/dashboard/products/new'}>
            <Plus className="w-4 h-4 mr-2" />
            Novo Produto
          </Button>
          <Button variant="outline" onClick={() => window.open('/api/products/export', '_blank')}>
            <FileText className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>

        <div className="relative max-w-xs w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Buscar produtos..."
            value={filters.search || ''}
            onChange={e => handleFilterChange('search', e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Floating Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-slate-900 dark:bg-slate-950 text-white rounded-xl p-3 px-5 flex flex-wrap items-center justify-between gap-3 shadow-2xl border border-slate-800 backdrop-blur-md transition-all duration-200 animate-in slide-in-from-top-2">
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-bold text-sm text-white flex items-center gap-1.5">
              <span className="inline-flex items-center justify-center bg-blue-600 text-white rounded-full h-5 min-w-5 px-1.5 text-xs font-black">
                {selectAllPages ? meta.totalCount : selectedIds.length}
              </span>
              {selectAllPages ? (
                <span>produto(s) selecionado(s) do catálogo inteiro!</span>
              ) : (
                <span>de {meta.totalCount} produto(s) selecionado(s)</span>
              )}
            </span>

            {/* Prompt para selecionar todas as páginas quando a página inteira estiver marcada */}
            {selectedIds.length === products.length && meta.totalCount > products.length && !selectAllPages && (
              <button
                type="button"
                onClick={() => setSelectAllPages(true)}
                className="text-xs text-amber-300 hover:text-amber-200 font-semibold underline underline-offset-2 transition-colors cursor-pointer bg-amber-950/40 px-2 py-1 rounded border border-amber-500/30"
              >
                Selecionar todos os {meta.totalCount} produtos do catálogo inteiro?
              </button>
            )}

            {selectAllPages && (
              <button
                type="button"
                onClick={() => setSelectAllPages(false)}
                className="text-xs text-slate-300 hover:text-white underline cursor-pointer"
              >
                Desfazer (manter apenas página atual)
              </button>
            )}

            <Button
              size="sm"
              variant="outline"
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs py-1 h-7 rounded-lg"
              onClick={() => {
                setSelectedIds([]);
                setSelectAllPages(false);
              }}
            >
              Limpar Seleção
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Botão Atualizar Preços em Massa */}
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1.5 px-3 h-8 font-semibold rounded-lg shadow-sm border-0 flex items-center"
              disabled={isBulkUpdating}
              onClick={() => setShowPriceModal(true)}
            >
              <DollarSign className="w-3.5 h-3.5 mr-1" />
              Atualizar Preço
            </Button>

            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs py-1.5 px-3 h-8 font-semibold rounded-lg shadow-sm border-0 flex items-center"
              disabled={isBulkUpdating}
              onClick={() => handleBulkUpdate({ is_active: true })}
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Ativar
            </Button>

            <Button
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs py-1.5 px-3 h-8 font-semibold rounded-lg shadow-sm border-0 flex items-center"
              disabled={isBulkUpdating}
              onClick={() => handleBulkUpdate({ is_active: false })}
            >
              <X className="w-3.5 h-3.5 mr-1" />
              Inativar
            </Button>

            <Button
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs py-1.5 px-3 h-8 font-semibold rounded-lg shadow-sm border-0 flex items-center"
              disabled={isBulkUpdating}
              onClick={() => handleBulkUpdate({ is_launch: true })}
            >
              <span className="mr-1">🚀</span> Lançamento
            </Button>

            <Button
              size="sm"
              className="bg-purple-600 hover:bg-purple-700 text-white text-xs py-1.5 px-3 h-8 font-semibold rounded-lg shadow-sm border-0 flex items-center"
              disabled={isBulkUpdating}
              onClick={() => handleBulkUpdate({ is_destaque: true })}
            >
              <Star className="w-3.5 h-3.5 mr-1 fill-current" />
              Destaque
            </Button>

            <Button
              size="sm"
              className="bg-rose-600 hover:bg-rose-700 text-white text-xs py-1.5 px-3 h-8 font-semibold rounded-lg shadow-sm border-0 flex items-center"
              disabled={isBulkUpdating}
              onClick={handleBulkDelete}
            >
              <Trash2 className="w-3.5 h-3.5 mr-1" />
              Excluir Selecionados
            </Button>
          </div>
        </div>
      )}

      {/* Modal de Atualização de Preço em Massa */}
      {showPriceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-gray-900 rounded-xl p-6 max-w-md w-full border border-gray-200 dark:border-gray-800 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-green-600" />
                Atualizar Preço em Massa
              </h3>
              <button onClick={() => setShowPriceModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-sm text-gray-500 dark:text-gray-400">
              Aplicando novo preço para <strong>{selectedIds.length}</strong> produto(s) selecionado(s).
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Modo de Ajuste</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPriceMode('fixed')}
                    className={`p-2 text-xs font-semibold rounded-lg border text-center transition-colors ${priceMode === 'fixed' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
                  >
                    Valor Fixo (R$)
                  </button>
                  <button
                    type="button"
                    onClick={() => setPriceMode('percentage')}
                    className={`p-2 text-xs font-semibold rounded-lg border text-center transition-colors ${priceMode === 'percentage' ? 'bg-blue-50 border-blue-500 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
                  >
                    Percentual (%)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {priceMode === 'fixed' ? 'Novo Preço (R$)' : 'Ajuste Percentual % (ex: 10 para +10% ou -10 para -10%)'}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder={priceMode === 'fixed' ? '150.00' : '10'}
                  value={priceValue}
                  onChange={(e) => setPriceValue(e.target.value)}
                  className="w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setShowPriceModal(false)}>
                Cancelar
              </Button>
              <Button size="sm" disabled={isBulkUpdating || !priceValue} onClick={handleExecutePriceUpdate}>
                {isBulkUpdating ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                Aplicar a {selectedIds.length} produto(s)
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Marca</label>
              <select
                value={filters.brand_id || ''}
                onChange={e => handleFilterChange('brand_id', e.target.value || undefined)}
                className="w-full p-2 border rounded-md text-sm bg-white dark:bg-gray-900"
              >
                <option value="">Todas</option>
                {brands.map(b => (
                  <option key={b.id} value={b.id}>{b.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Categoria</label>
              <select
                value={filters.category_id || ''}
                onChange={e => handleFilterChange('category_id', e.target.value || undefined)}
                className="w-full p-2 border rounded-md text-sm bg-white dark:bg-gray-900"
              >
                <option value="">Todas</option>
                {categories.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Material</label>
              <select
                value={filters.material || ''}
                onChange={e => handleFilterChange('material', e.target.value || undefined)}
                className="w-full p-2 border rounded-md text-sm bg-white dark:bg-gray-900"
              >
                <option value="">Todos</option>
                <option value="Acetato">Acetato</option>
                <option value="Metal">Metal</option>
                <option value="TR90">TR90</option>
                <option value="Titânio">Titânio</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tipo de Montagem</label>
              <select
                value={(filters as any).tipo_montagem || ''}
                onChange={e => handleFilterChange('tipo_montagem' as any, e.target.value || undefined)}
                className="w-full p-2 border rounded-md text-sm bg-white dark:bg-gray-900"
              >
                <option value="">Todos os tipos</option>
                <option value="aro_fechado">Aro Fechado</option>
                <option value="fio_nylon">Fio de Nylon</option>
                <option value="balgriff">Balgriff / Parafuso</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
              <select
                value={filters.is_active?.toString() || ''}
                onChange={e => {
                  const val = e.target.value;
                  handleFilterChange('is_active', val === 'true' ? true : val === 'false' ? false : undefined);
                }}
                className="w-full p-2 border rounded-md text-sm bg-white dark:bg-gray-900"
              >
                <option value="">Todos</option>
                <option value="true">Ativos</option>
                <option value="false">Inativos</option>
              </select>
            </div>
            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Preço</label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  placeholder="Mín"
                  value={filters.min_price || ''}
                  onChange={e => handleFilterChange('min_price', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-24"
                  step="0.01"
                />
                <Input
                  type="number"
                  placeholder="Máx"
                  value={filters.max_price || ''}
                  onChange={e => handleFilterChange('max_price', e.target.value ? parseFloat(e.target.value) : undefined)}
                  className="w-24"
                  step="0.01"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 pt-4 lg:col-span-4 border-t border-gray-200 dark:border-gray-700">
              <label className="flex items-center gap-2 cursor-pointer font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-1 rounded-lg border border-amber-200 dark:border-amber-800">
                <input
                  type="checkbox"
                  checked={(filters as any).is_launch === true}
                  onChange={e => handleFilterChange('is_launch' as any, e.target.checked ? true : undefined)}
                  className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                />
                🚀 Apenas Lançamentos
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.fotocromatico === true}
                  onChange={e => handleFilterChange('fotocromatico', e.target.checked ? true : undefined)}
                  className="rounded border-gray-300 text-blue-600"
                />
                Fotocromático
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.polarizado === true}
                  onChange={e => handleFilterChange('polarizado', e.target.checked ? true : undefined)}
                  className="rounded border-gray-300 text-blue-600"
                />
                Polarizado
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={filters.in_stock === true}
                  onChange={e => handleFilterChange('in_stock', e.target.checked ? true : undefined)}
                  className="rounded border-gray-300 text-blue-600"
                />
                Em estoque
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
        {loading ? (
          <div className="p-8 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-2" />
            <p className="text-gray-500">Carregando produtos...</p>
          </div>
        ) : products.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Tag className="h-12 w-12 mx-auto mb-2 text-gray-300" />
            <p>Nenhum produto encontrado</p>
            <p className="text-sm mt-1">Clique em "Novo Produto" para começar</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={products.length > 0 && selectedIds.length === products.length}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  {visibleColumns.image_url !== false && <SortableHeader columnKey="image_url" title="Imagem" />}
                  {visibleColumns.reference_code !== false && <SortableHeader columnKey="reference_code" title="Ref." />}
                  {visibleColumns.name !== false && <SortableHeader columnKey="name" title="Produto" />}
                  {visibleColumns.brand !== false && <SortableHeader columnKey="brand" title="Marca" />}
                  {visibleColumns.category !== false && <SortableHeader columnKey="category" title="Categoria" />}
                  {visibleColumns.price !== false && <SortableHeader columnKey="price" title="Preço" />}
                  {visibleColumns.sale_price !== false && <SortableHeader columnKey="sale_price" title="Promo" />}
                  {visibleColumns.stock_quantity !== false && <SortableHeader columnKey="stock_quantity" title="Estoque" />}
                  {visibleColumns.is_active !== false && <SortableHeader columnKey="is_active" title="Status" />}
                  {visibleColumns.is_launch !== false && <SortableHeader columnKey="is_launch" title="Lanç." />}
                  {visibleColumns.is_destaque !== false && <SortableHeader columnKey="is_destaque" title="Destaque" />}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {products.map(product => (
                  <tr key={product.id} className={selectedIds.includes(product.id) ? 'bg-blue-50/60 dark:bg-blue-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}>
                    <td className="px-4 py-3 w-10">
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(product.id)}
                        onChange={() => handleSelectOne(product.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </td>
                    {visibleColumns.image_url !== false && (
                      <td className="px-4 py-3">
                        {product.image_url ? (
                          <Image
                            src={formatImageUrl(product.image_url)}
                            alt={product.name}
                            width={50}
                            height={50}
                            className="rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                            <Tag className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </td>
                    )}
                    {visibleColumns.reference_code !== false && (
                      <td className="px-4 py-3 text-sm text-gray-500">{product.reference_code || product.short_id || '-'}</td>
                    )}
                    {visibleColumns.name !== false && (
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">{product.name}</div>
                        {product.sku && <div className="text-xs text-gray-500">SKU: {product.sku}</div>}
                      </td>
                    )}
                    {visibleColumns.brand !== false && (
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{product.brand || '-'}</td>
                    )}
                    {visibleColumns.category !== false && (
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">{product.category || '-'}</td>
                    )}
                    {visibleColumns.price !== false && (
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {product.price ? `R$ ${product.price.toFixed(2).replace('.', ',')}` : '-'}
                        </div>
                        {product.cost && (
                          <div className="text-xs text-gray-500">Custo: R$ {product.cost.toFixed(2).replace('.', ',')}</div>
                        )}
                      </td>
                    )}
                    {visibleColumns.sale_price !== false && (
                      <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                        {product.sale_price ? `R$ ${product.sale_price.toFixed(2).replace('.', ',')}` : '-'}
                      </td>
                    )}
                    {visibleColumns.stock_quantity !== false && (
                      <td className="px-4 py-3">
                        <span className={product.stock_quantity === null || product.stock_quantity <= 0 
                          ? 'text-red-600 font-medium' 
                          : product.stock_quantity !== null && product.stock_quantity <= (product.min_stock_level || 5)
                          ? 'text-yellow-600 font-medium'
                          : 'text-green-600 font-medium'
                        }>
                          {product.stock_quantity !== null ? product.stock_quantity : '∞'}
                        </span>
                        {product.min_stock_level && product.stock_quantity !== null && (
                          <div className="text-xs text-gray-500">Mín: {product.min_stock_level}</div>
                        )}
                      </td>
                    )}
                    {visibleColumns.is_active !== false && (
                      <td className="px-4 py-3">
                        <Button
                          variant={product.is_active ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => handleToggleActive(product)}
                          className="w-full"
                        >
                          {product.is_active ? (
                            <Check className="w-4 h-4 text-green-600" />
                          ) : (
                            <X className="w-4 h-4 text-red-600" />
                          )}
                        </Button>
                      </td>
                    )}
                    {visibleColumns.is_launch !== false && (
                      <td className="px-4 py-3 text-center">
                        {product.is_launch ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800">
                            <span className="mr-1">🚀</span> Sim
                          </span>
                        ) : '-'}
                      </td>
                    )}
                    {visibleColumns.is_destaque !== false && (
                      <td className="px-4 py-3 text-center">
                        {product.is_destaque ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800">
                            <Star className="w-3 h-3 mr-1 fill-current" /> Sim
                          </span>
                        ) : '-'}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <a
                          href={`/dashboard/products/${product.id}`}
                          className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => handleDelete(product.id)}
                          disabled={deletingId === product.id}
                          className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded transition-colors disabled:opacity-50"
                          title="Excluir"
                        >
                          {deletingId === product.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {meta.totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Página {meta.page} de {meta.totalPages} — {meta.totalCount} produtos
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(meta.page - 1)}
                    disabled={meta.page <= 1}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(meta.page + 1)}
                    disabled={meta.page >= meta.totalPages}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}