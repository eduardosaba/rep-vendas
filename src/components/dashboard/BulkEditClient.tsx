'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  Filter,
  Save,
  RotateCcw,
  AlertCircle,
  X,
  Columns,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';

interface Product {
  id: string;
  user_id: string; // Adicionado user_id
  name: string;
  reference_code: string | null;
  price: number;
  sale_price: number | null;
  brand: string | null;
  stock_quantity: number;
}

export default function BulkEditClient({
  initialProducts,
}: {
  initialProducts: Product[];
}) {
  const [products, setProducts] = useState<Product[]>(initialProducts);
  const [loading, setLoading] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // --- ESTADO DAS COLUNAS ---
  const [showColumnMenu, setShowColumnMenu] = useState(false);
  const columnMenuRef = useRef<HTMLDivElement>(null);

  const [visibleColumns, setVisibleColumns] = useState({
    reference_code: true,
    name: true,
    brand: true,
    stock_quantity: true,
    price: true,
    sale_price: true,
  });

  // --- FILTROS ---
  const [filters, setFilters] = useState({
    search: '',
    brand: 'all',
    stock: 'all',
  });

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        columnMenuRef.current &&
        !columnMenuRef.current.contains(event.target as Node)
      ) {
        setShowColumnMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleColumn = (key: keyof typeof visibleColumns) => {
    setVisibleColumns((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const uniqueBrands = useMemo(() => {
    const brands = initialProducts
      .map((p) => p.brand)
      .filter((b) => b !== null && b !== '') as string[];
    return Array.from(new Set(brands)).sort();
  }, [initialProducts]);

  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(filters.search.toLowerCase()) ||
        (product.reference_code &&
          product.reference_code
            .toLowerCase()
            .includes(filters.search.toLowerCase()));

      const matchesBrand =
        filters.brand === 'all' || product.brand === filters.brand;

      let matchesStock = true;
      if (filters.stock === 'in_stock')
        matchesStock = product.stock_quantity > 0;
      if (filters.stock === 'out_of_stock')
        matchesStock = product.stock_quantity === 0;
      if (filters.stock === 'negative')
        matchesStock = product.stock_quantity < 0;

      return matchesSearch && matchesBrand && matchesStock;
    });
  }, [products, filters]);

  // --- HANDLERS ---
  const handleInputChange = (
    id: string,
    field: keyof Product,
    value: string | number | null
  ) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
    setHasChanges(true);
  };

  const handleCurrencyChange = (
    id: string,
    field: keyof Product,
    rawValue: string
  ) => {
    const digits = rawValue.replace(/\D/g, '');
    const floatValue = Number(digits) / 100;
    handleInputChange(id, field, floatValue);
  };

  const formatCurrencyDisplay = (value: number | null) => {
    if (value === null || value === undefined) return '0,00';
    return value.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      // Build payload to send to server API which uses service role key
      const payload = products.map((p) => ({
        id: p.id,
        user_id: p.user_id,
        name: p.name,
        brand: p.brand,
        price: p.price,
        sale_price: p.sale_price,
        reference_code: p.reference_code === '' ? null : p.reference_code,
        stock_quantity: p.stock_quantity,
        updated_at: new Date().toISOString(),
      }));

      const res = await fetch('/api/admin/bulk-upsert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ products: payload }),
      });

      const json = await res.json();
      if (!res.ok) {
        throw new Error(json?.error || 'Erro ao salvar');
      }

      toast.success('Tabela atualizada com sucesso!');
      setHasChanges(false);
    } catch (error: any) {
      console.error('Erro no upsert via API:', error);
      toast.error('Erro ao salvar', {
        description: error.message || 'Verifique sua conexão.',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (confirm('Descartar todas as alterações não salvas?')) {
      setProducts(initialProducts);
      setHasChanges(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* BARRA DE FERRAMENTAS */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-xl border border-gray-200 dark:border-slate-800 shadow-sm flex flex-col xl:flex-row gap-4 items-start xl:items-center justify-between flex-wrap">
        {/* Filtros */}
        <div className="flex flex-wrap gap-3 w-full xl:w-auto flex-1 items-center">
          <div className="relative w-full sm:w-64">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
              size={18}
            />
            <input
              type="text"
              placeholder="Buscar nome ou ref..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white dark:bg-slate-950 dark:text-white"
              value={filters.search}
              onChange={(e) =>
                setFilters((prev) => ({ ...prev, search: e.target.value }))
              }
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto">
            <div className="relative min-w-[140px]">
              <Filter
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={16}
              />
              <select
                className="w-full pl-9 pr-8 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white dark:bg-slate-950 dark:text-white cursor-pointer"
                value={filters.brand}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, brand: e.target.value }))
                }
              >
                <option value="all">Marcas</option>
                {uniqueBrands.map((b) => (
                  <option key={b} value={b}>
                    {b}
                  </option>
                ))}
              </select>
            </div>

            <div className="relative min-w-[140px]">
              <select
                className="w-full pl-3 pr-8 py-2 border border-gray-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none appearance-none bg-white dark:bg-slate-950 dark:text-white cursor-pointer"
                value={filters.stock}
                onChange={(e) =>
                  setFilters((prev) => ({ ...prev, stock: e.target.value }))
                }
              >
                <option value="all">Estoque: Todos</option>
                <option value="in_stock">Com Estoque</option>
                <option value="out_of_stock">Zerado (0)</option>
                <option value="negative">Negativo</option>
              </select>
            </div>
          </div>

          {(filters.search ||
            filters.brand !== 'all' ||
            filters.stock !== 'all') && (
            <button
              onClick={() =>
                setFilters({ search: '', brand: 'all', stock: 'all' })
              }
              className="flex items-center justify-center px-3 py-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
              title="Limpar Filtros"
            >
              <X size={18} />
            </button>
          )}
        </div>

        {/* Ações */}
        <div className="flex items-center gap-3 w-full xl:w-auto border-t xl:border-t-0 xl:border-l border-gray-200 dark:border-slate-800 pt-4 xl:pt-0 xl:pl-4 justify-between xl:justify-end flex-wrap">
          <div className="relative" ref={columnMenuRef}>
            <button
              onClick={() => setShowColumnMenu(!showColumnMenu)}
              className={`flex items-center gap-2 px-3 py-2 text-sm font-medium border rounded-lg transition-colors ${showColumnMenu ? 'bg-gray-100 border-gray-300 dark:bg-slate-800 dark:border-slate-600' : 'bg-white border-gray-200 hover:bg-gray-50 dark:bg-slate-900 dark:border-slate-800 dark:text-white'}`}
            >
              <Columns size={16} />
              <span className="inline">Colunas</span>
            </button>

            {showColumnMenu && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-gray-200 dark:border-slate-700 z-50 p-2 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between px-2 mb-2">
                  <p className="text-xs font-bold text-gray-400 uppercase">
                    Exibir
                  </p>
                  <label className="flex items-center gap-2 text-xs text-gray-600 dark:text-slate-300">
                    <input
                      type="checkbox"
                      checked={Object.values(visibleColumns).every(Boolean)}
                      onChange={(e) => {
                        const keys = Object.keys(
                          visibleColumns
                        ) as (keyof typeof visibleColumns)[];
                        const newState: Record<string, boolean> = {};
                        keys.forEach((k) => (newState[k] = e.target.checked));
                        setVisibleColumns(newState as any);
                      }}
                      className="h-4 w-4 text-primary rounded border-gray-300 dark:border-slate-600 dark:bg-slate-800 focus:ring-primary"
                    />
                    Selecionar todos
                  </label>
                </div>
                {Object.keys(visibleColumns).map((key) => {
                  const k = key as keyof typeof visibleColumns;
                  const labels: Record<string, string> = {
                    reference_code: 'Referência',
                    name: 'Produto',
                    brand: 'Marca',
                    stock_quantity: 'Estoque',
                    price: 'Preço Custo',
                    sale_price: 'Preço Venda',
                  };
                  return (
                    <button
                      key={k}
                      onClick={() => toggleColumn(k)}
                      className="flex items-center justify-between w-full px-2 py-2 text-sm text-left hover:bg-gray-50 dark:hover:bg-slate-800 rounded-md transition-colors text-gray-700 dark:text-gray-300"
                    >
                      <span>{labels[k]}</span>
                      {visibleColumns[k] && (
                        <Check size={14} className="text-blue-600" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                <RotateCcw size={16} />{' '}
                <span className="hidden sm:inline">Cancelar</span>
              </button>
            )}

            <button
              onClick={handleSave}
              disabled={!hasChanges || loading}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-sm font-bold text-white shadow-md transition-all whitespace-nowrap ${
                hasChanges
                  ? 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg hover:-translate-y-0.5'
                  : 'bg-gray-300 dark:bg-slate-700 cursor-not-allowed opacity-70'
              }`}
            >
              {loading ? (
                <RotateCcw className="animate-spin" size={18} />
              ) : (
                <Save size={18} />
              )}
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </button>
          </div>
        </div>
      </div>

      {/* TABELA / CARDS */}
      <div className="flex-1 overflow-auto border border-gray-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm relative">
        {/* Desktop: tabela tradicional */}
        <div className="hidden md:block w-full overflow-x-auto shadow-sm border border-gray-100 rounded-lg">
          <table className="w-full text-sm text-left min-w-full">
            <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 sticky top-0 z-10 shadow-sm">
              <tr>
                {visibleColumns.reference_code && (
                  <th className="px-4 py-3 font-medium w-32">Ref</th>
                )}
                {visibleColumns.name && (
                  <th className="px-4 py-3 font-medium min-w-[200px]">
                    Produto
                  </th>
                )}
                {visibleColumns.brand && (
                  <th className="px-4 py-3 font-medium w-32">Marca</th>
                )}
                {visibleColumns.stock_quantity && (
                  <th className="px-4 py-3 font-medium w-28 text-right">
                    Estoque
                  </th>
                )}
                {visibleColumns.price && (
                  <th className="px-4 py-3 font-medium w-36 text-right">
                    Preço Custo
                  </th>
                )}
                {visibleColumns.sale_price && (
                  <th className="px-4 py-3 font-medium w-36 text-right">
                    Preço Venda
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
              {filteredProducts.map((product) => (
                <tr
                  key={product.id}
                  className="hover:bg-blue-50/50 dark:hover:bg-slate-800/50 transition-colors group"
                >
                  {visibleColumns.reference_code && (
                    <td className="px-4 py-2">
                      <input
                        className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[var(--primary)] focus:bg-white dark:focus:bg-slate-950 outline-none transition-all py-1 text-sm text-gray-700 dark:text-gray-300 font-sans"
                        value={product.reference_code || ''}
                        onChange={(e) =>
                          handleInputChange(
                            product.id,
                            'reference_code',
                            e.target.value
                          )
                        }
                        placeholder="-"
                      />
                    </td>
                  )}

                  {visibleColumns.name && (
                    <td className="px-4 py-2">
                      <input
                        className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-[var(--primary)] focus:bg-white dark:focus:bg-slate-950 outline-none transition-all py-1 text-sm text-gray-700 dark:text-gray-300 font-sans"
                        value={product.name}
                        onChange={(e) =>
                          handleInputChange(product.id, 'name', e.target.value)
                        }
                      />
                    </td>
                  )}

                  {visibleColumns.brand && (
                    <td className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 font-sans">
                      {product.brand || (
                        <span className="opacity-30 italic">Sem marca</span>
                      )}
                    </td>
                  )}

                  {visibleColumns.stock_quantity && (
                    <td className="px-4 py-2 text-right">
                      <div className="relative">
                        <input
                          type="number"
                          className={`w-full text-right bg-transparent border border-transparent hover:border-gray-300 focus:border-[var(--primary)] rounded px-2 py-1 outline-none focus:bg-white dark:focus:bg-slate-950 transition-all text-sm font-sans ${product.stock_quantity === 0 ? 'text-red-500 bg-red-50 dark:bg-red-900/20' : product.stock_quantity < 0 ? 'text-red-700' : 'text-gray-700 dark:text-gray-300'}`}
                          value={product.stock_quantity}
                          onChange={(e) =>
                            handleInputChange(
                              product.id,
                              'stock_quantity',
                              Number(e.target.value)
                            )
                          }
                        />
                      </div>
                    </td>
                  )}

                  {visibleColumns.price && (
                    <td className="px-4 py-2 text-right">
                      <div className="relative group/input">
                        <span className="absolute left-2 top-1.5 text-gray-400 text-xs pointer-events-none group-focus-within/input:text-blue-500 transition-colors">
                          R$
                        </span>
                        <input
                          type="text"
                          className="w-full text-right bg-transparent border border-gray-200 dark:border-slate-700 rounded px-2 py-1 pl-6 outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] focus:bg-white dark:focus:bg-slate-950 transition-all text-sm text-gray-700 dark:text-gray-300 font-sans"
                          value={formatCurrencyDisplay(product.price)}
                          onChange={(e) =>
                            handleCurrencyChange(
                              product.id,
                              'price',
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </td>
                  )}

                  {visibleColumns.sale_price && (
                    <td className="px-4 py-2 text-right">
                      <div className="relative group/input">
                        <span className="absolute left-2 top-1.5 text-gray-400 text-xs pointer-events-none group-focus-within/input:text-blue-500 transition-colors">
                          R$
                        </span>
                        <input
                          type="text"
                          className="w-full text-right bg-gray-50 dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded px-2 py-1 pl-6 outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] focus:bg-white dark:focus:bg-slate-950 transition-all text-sm text-gray-700 dark:text-gray-300 font-sans"
                          value={formatCurrencyDisplay(product.sale_price)}
                          onChange={(e) =>
                            handleCurrencyChange(
                              product.id,
                              'sale_price',
                              e.target.value
                            )
                          }
                        />
                      </div>
                    </td>
                  )}
                </tr>
              ))}

              {filteredProducts.length === 0 && (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-gray-400">
                    <AlertCircle
                      className="mx-auto mb-2 opacity-50"
                      size={32}
                    />
                    Nenhum produto encontrado com os filtros atuais.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile: tabela rolável com campos editáveis */}
        <div className="md:hidden p-2">
          {filteredProducts.length === 0 ? (
            <div className="p-4 text-center text-gray-500 dark:text-slate-400 bg-white dark:bg-slate-900 rounded-xl border border-gray-100 dark:border-slate-800">
              Nenhum produto encontrado com os filtros atuais.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-[720px] w-full text-sm">
                <thead className="bg-gray-50 dark:bg-slate-800 text-gray-500 dark:text-gray-400 sticky top-0 z-10">
                  <tr>
                    {visibleColumns.reference_code && <th className="px-3 py-2 font-medium">Ref</th>}
                    {visibleColumns.name && <th className="px-3 py-2 font-medium min-w-[160px]">Produto</th>}
                    {visibleColumns.brand && <th className="px-3 py-2 font-medium">Marca</th>}
                    {visibleColumns.stock_quantity && <th className="px-3 py-2 font-medium text-right">Estoque</th>}
                    {visibleColumns.price && <th className="px-3 py-2 font-medium text-right">Preço</th>}
                    {visibleColumns.sale_price && <th className="px-3 py-2 font-medium text-right">Venda</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="bg-white dark:bg-slate-900">
                      {visibleColumns.reference_code && (
                        <td className="px-3 py-2 align-top">
                          <input
                            className="w-full p-2 border rounded text-sm bg-transparent"
                            value={product.reference_code || ''}
                            onChange={(e) =>
                              handleInputChange(product.id, 'reference_code', e.target.value)
                            }
                            placeholder="Ref"
                          />
                        </td>
                      )}

                      {visibleColumns.name && (
                        <td className="px-3 py-2 align-top min-w-[160px]">
                          <input
                            className="w-full p-2 border rounded text-sm bg-transparent"
                            value={product.name}
                            onChange={(e) => handleInputChange(product.id, 'name', e.target.value)}
                          />
                        </td>
                      )}

                      {visibleColumns.brand && (
                        <td className="px-3 py-2 align-top">
                          <div className="text-sm text-gray-700 dark:text-gray-300">{product.brand || 'Sem marca'}</div>
                        </td>
                      )}

                      {visibleColumns.stock_quantity && (
                        <td className="px-3 py-2 align-top text-right">
                          <input
                            type="number"
                            className="w-20 p-2 border rounded text-sm bg-transparent text-right"
                            value={product.stock_quantity}
                            onChange={(e) => handleInputChange(product.id, 'stock_quantity', Number(e.target.value))}
                          />
                        </td>
                      )}

                      {visibleColumns.price && (
                        <td className="px-3 py-2 align-top text-right">
                          <input
                            className="w-28 p-2 border rounded text-sm bg-transparent text-right"
                            value={formatCurrencyDisplay(product.price)}
                            onChange={(e) => handleCurrencyChange(product.id, 'price', e.target.value)}
                          />
                        </td>
                      )}

                      {visibleColumns.sale_price && (
                        <td className="px-3 py-2 align-top text-right">
                          <input
                            className="w-28 p-2 border rounded text-sm bg-transparent text-right"
                            value={formatCurrencyDisplay(product.sale_price)}
                            onChange={(e) => handleCurrencyChange(product.id, 'sale_price', e.target.value)}
                          />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <div className="text-xs text-gray-400 text-center">
        Exibindo {filteredProducts.length} de {products.length} produtos.
        Alterações pendentes ficam destacadas.
      </div>
    </div>
  );
}
