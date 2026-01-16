'use client';

import React, { useState } from 'react';
import {
  Percent,
  DollarSign,
  Zap,
  Loader2,
  Rocket,
  Search,
  ArrowRightLeft,
} from 'lucide-react';
import { toast } from 'sonner';
import { bulkPriceAdjustAction } from '@/app/actions/admin-actions';
import { createClient } from '@/lib/supabase/client';

export default function BulkPriceAdjuster({
  brands,
  userRole,
}: {
  brands: string[];
  userRole: string | null;
}) {
  const [selectedBrand, setSelectedBrand] = useState('');
  const [type, setType] = useState<'percent' | 'fixed'>('percent');
  const [value, setValue] = useState('');
  const [propagate, setPropagate] = useState(true);
  const [loading, setLoading] = useState(false);

  // Estados para propagação de template
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [templateProducts, setTemplateProducts] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [propagating, setPropagating] = useState(false);

  const handleSearchTemplate = async () => {
    if (!searchTerm) return;
    setLoadingSearch(true);
    try {
      const supabase = createClient();

      // Busca usuário template
      const { data: templateUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'template')
        .maybeSingle();

      if (!templateUser) {
        toast.error('Nenhum usuário template configurado');
        return;
      }

      // Busca produtos do template
      const { data, error } = await supabase
        .from('products')
        .select(
          'id, reference_code, name, brand, price, sale_price, image_url, image_path'
        )
        .eq('user_id', templateUser.id)
        .eq('is_active', true)
        .ilike('reference_code', `%${searchTerm}%`)
        .order('reference_code')
        .limit(10);

      if (error) throw error;
      setTemplateProducts(data || []);
    } catch (err: any) {
      toast.error('Erro ao buscar produtos: ' + err.message);
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSyncPrice = async (
    product: any,
    syncType: 'price' | 'sale_price'
  ) => {
    const priceValue =
      syncType === 'price' ? product.price : product.sale_price;

    if (!priceValue) {
      toast.error(
        `${syncType === 'price' ? 'Preço' : 'Preço promocional'} não definido`
      );
      return;
    }

    setPropagating(true);
    try {
      const response = await fetch('/api/admin/sync-template-prices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateProductId: product.id,
          newPrice: syncType === 'price' ? priceValue : undefined,
          newSalePrice: syncType === 'sale_price' ? priceValue : undefined,
          syncType,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erro ao sincronizar');
      }

      toast.success(
        `✓ ${result.affectedRows} representante(s) atualizado(s) com ${syncType === 'price' ? 'preço' : 'preço promocional'} R$ ${priceValue.toFixed(2)}`
      );
    } catch (err: any) {
      toast.error('Erro: ' + err.message);
    } finally {
      setPropagating(false);
    }
  };

  const handleApply = async () => {
    if (!selectedBrand || !value)
      return toast.error('Preencha todos os campos');
    setLoading(true);
    try {
      const result = await bulkPriceAdjustAction({
        brand: selectedBrand,
        type,
        value: parseFloat(value.replace(',', '.')),
        propagate,
      });

      if (result?.success) {
        toast.success(
          `Sucesso! ${result.affectedRows} produtos da marca ${selectedBrand} foram atualizados.`
        );
        setValue('');
      }
    } catch (err: any) {
      toast.error('Erro no ajuste: ' + (err?.message || String(err)));
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Modal de Propagação de Template */}
      {showTemplateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[80vh] overflow-hidden border border-gray-200 dark:border-slate-700 shadow-2xl">
            <div className="p-6 border-b border-gray-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Rocket size={24} className="text-indigo-600" />
                <h3 className="font-black text-xl">
                  Propagação de Preços do Template
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowTemplateModal(false);
                  setSearchTerm('');
                  setTemplateProducts([]);
                }}
                className="text-gray-400 hover:text-gray-600 text-2xl"
              >
                ×
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Digite o código do produto..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchTemplate()}
                  className="flex-1 px-4 py-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 outline-none"
                />
                <button
                  onClick={handleSearchTemplate}
                  disabled={loadingSearch}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all"
                >
                  {loadingSearch ? (
                    <Loader2 className="animate-spin" size={20} />
                  ) : (
                    <Search size={20} />
                  )}
                </button>
              </div>

              <div className="max-h-96 overflow-y-auto space-y-3">
                {templateProducts.map((product) => (
                  <div
                    key={product.id}
                    className="p-4 bg-gray-50 dark:bg-slate-800 rounded-2xl border border-gray-200 dark:border-slate-700"
                  >
                    <div className="flex gap-4">
                      {(product.image_url || product.image_path) && (
                        <img
                          src={product.image_url || product.image_path}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded-xl"
                        />
                      )}
                      <div className="flex-1">
                        <div className="font-bold text-sm">
                          {product.reference_code}
                        </div>
                        <div className="text-xs text-gray-600 dark:text-gray-400">
                          {product.name} - {product.brand}
                        </div>
                        <div className="flex gap-4 mt-2">
                          <div className="text-xs">
                            <span className="text-gray-500">Preço: </span>
                            <span className="font-bold text-green-600">
                              {product.price
                                ? `R$ ${product.price.toFixed(2)}`
                                : 'N/D'}
                            </span>
                          </div>
                          {product.sale_price && (
                            <div className="text-xs">
                              <span className="text-gray-500">
                                Promocional:{' '}
                              </span>
                              <span className="font-bold text-orange-600">
                                R$ {product.sale_price.toFixed(2)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2">
                        <button
                          onClick={() => handleSyncPrice(product, 'price')}
                          disabled={propagating || !product.price}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg font-bold hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                        >
                          {propagating ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <ArrowRightLeft size={14} />
                          )}
                          Propagar Preço
                        </button>
                        {product.sale_price && (
                          <button
                            onClick={() =>
                              handleSyncPrice(product, 'sale_price')
                            }
                            disabled={propagating}
                            className="px-3 py-1.5 bg-orange-600 text-white text-xs rounded-lg font-bold hover:bg-orange-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                          >
                            {propagating ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <ArrowRightLeft size={14} />
                            )}
                            Propagar Promo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                {templateProducts.length === 0 &&
                  searchTerm &&
                  !loadingSearch && (
                    <div className="text-center text-gray-400 py-8">
                      Nenhum produto encontrado
                    </div>
                  )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-gray-100 dark:border-slate-800 shadow-sm space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-amber-600">
            <Zap size={24} fill="currentColor" />
            <h3 className="font-black text-xl uppercase tracking-tighter">
              Reajuste em Massa
            </h3>
          </div>

          {userRole === 'master' && (
            <button
              onClick={() => setShowTemplateModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-2xl font-bold hover:bg-indigo-700 transition-all shadow-lg"
            >
              <Rocket size={18} />
              <span className="text-sm">Propagar do Template</span>
            </button>
          )}
        </div>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">
              Marca Alvo
            </label>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="w-full mt-1 px-4 py-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 outline-none"
            >
              <option value="">Selecione a marca...</option>
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">
                Tipo
              </label>
              <div className="flex bg-gray-100 dark:bg-slate-800 p-1 rounded-2xl mt-1">
                <button
                  onClick={() => setType('percent')}
                  className={`flex-1 flex justify-center py-2 rounded-xl transition-all ${
                    type === 'percent'
                      ? 'bg-white shadow-sm text-indigo-600'
                      : 'text-gray-500'
                  }`}
                >
                  <Percent size={18} />
                </button>
                <button
                  onClick={() => setType('fixed')}
                  className={`flex-1 flex justify-center py-2 rounded-xl transition-all ${
                    type === 'fixed'
                      ? 'bg-white shadow-sm text-indigo-600'
                      : 'text-gray-500'
                  }`}
                >
                  <DollarSign size={18} />
                </button>
              </div>
            </div>
            <div className="flex-1">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">
                Valor ({type === 'percent' ? '%' : 'R$'})
              </label>
              <input
                type="text"
                placeholder={type === 'percent' ? 'Ex: 5' : 'Ex: 10,00'}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full mt-1 px-4 py-3 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50 dark:bg-slate-800 outline-none"
              />
            </div>
          </div>

          <label className="flex items-center gap-3 cursor-pointer p-2 bg-amber-50 dark:bg-amber-900/10 rounded-2xl border border-amber-100 dark:border-amber-900/30">
            <input
              type="checkbox"
              checked={propagate}
              onChange={(e) => setPropagate(e.target.checked)}
              className="w-5 h-5 accent-amber-600"
            />
            <span className="text-xs font-bold text-amber-800 dark:text-amber-500">
              Propagar alteração para todos os representantes clonados
            </span>
          </label>

          <div className="flex gap-3">
            <button
              onClick={handleApply}
              disabled={loading}
              className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-amber-600 transition-all shadow-lg shadow-amber-200 dark:shadow-none"
            >
              {loading ? (
                <Loader2 className="animate-spin mx-auto" />
              ) : (
                'Aplicar Reajuste Global'
              )}
            </button>

            <a
              href={
                selectedBrand
                  ? `/admin/products/bulk-edit?brand=${encodeURIComponent(selectedBrand)}`
                  : '/admin/products/bulk-edit'
              }
              className="flex-1 py-4 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold uppercase tracking-widest hover:bg-gray-50 text-center"
            >
              Editar manual (Torre)
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
