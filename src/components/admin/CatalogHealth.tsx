'use client';

import React, { useState } from 'react';
import { AlertTriangle, Loader2, Search, ArrowRightLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function CatalogHealth({ stats }: { stats: any[] }) {
  const [showModal, setShowModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [templateProducts, setTemplateProducts] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [propagating, setPropagating] = useState(false);
  const [selectedState, setSelectedState] = useState<string | null>(null);

  const handleSearchTemplate = async (q: string) => {
    if (!q) return;
    setLoadingSearch(true);
    try {
      const res = await fetch(
        `/api/admin/search-template-products?q=${encodeURIComponent(q)}`
      );
      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Erro ao buscar');
      setTemplateProducts(j.data || []);
    } catch (err: any) {
      toast.error(err.message || 'Erro na busca');
    } finally {
      setLoadingSearch(false);
    }
  };

  const handleSyncByState = async (
    product: any,
    syncType: 'price' | 'sale_price',
    state: string
  ) => {
    setPropagating(true);
    try {
      const res = await fetch('/api/admin/sync-by-state', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          state,
          templateProductId: product.id,
          syncType: syncType === 'price' ? 'price' : 'sale_price',
        }),
      });

      const j = await res.json();
      if (!res.ok) throw new Error(j?.error || 'Erro na sincronização');

      toast.success(
        `✓ ${j.affected} representante(s) atualizados em ${j.state}`
      );
      setShowModal(false);
    } catch (err: any) {
      toast.error(err.message || 'Erro ao sincronizar');
    } finally {
      setPropagating(false);
    }
  };

  return (
    <>
      {/* Modal para busca de produto template e sincronização por estado */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white dark:bg-slate-900 rounded-2xl max-w-2xl w-full p-6 border border-gray-200 dark:border-slate-800">
            <div className="flex items-center gap-3 mb-4">
              <input
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) =>
                  e.key === 'Enter' && handleSearchTemplate(searchTerm)
                }
                placeholder="Buscar produto template por código..."
                className="flex-1 px-4 py-3 rounded-2xl border bg-gray-50 dark:bg-slate-800"
              />
              <button
                onClick={() => handleSearchTemplate(searchTerm)}
                className="px-4 py-3 bg-indigo-600 text-white rounded-2xl"
              >
                {loadingSearch ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <Search />
                )}
              </button>
            </div>

            <div className="space-y-3 max-h-80 overflow-y-auto">
              {templateProducts.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800 rounded-lg"
                >
                  <div>
                    <div className="font-bold">
                      {p.reference_code} — {p.name}
                    </div>
                    <div className="text-xs text-gray-400">
                      R$ {p.price?.toFixed?.(2) ?? '-'}{' '}
                      {p.sale_price && (
                        <span className="ml-2 text-xs text-orange-600">
                          Promo: R$ {p.sale_price?.toFixed?.(2)}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        handleSyncByState(p, 'price', selectedState || '')
                      }
                      disabled={propagating || !selectedState}
                      className="px-3 py-2 bg-green-600 text-white rounded-lg"
                    >
                      {propagating ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <ArrowRightLeft size={14} />
                      )}{' '}
                      Propagar Preço
                    </button>
                    {p.sale_price != null && (
                      <button
                        onClick={() =>
                          handleSyncByState(
                            p,
                            'sale_price',
                            selectedState || ''
                          )
                        }
                        disabled={propagating || !selectedState}
                        className="px-3 py-2 bg-orange-600 text-white rounded-lg"
                      >
                        {propagating ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <ArrowRightLeft size={14} />
                        )}{' '}
                        Propagar Promo
                      </button>
                    )}
                  </div>
                </div>
              ))}
              {templateProducts.length === 0 && (
                <div className="text-center text-gray-400">
                  Nenhum produto encontrado
                </div>
              )}
            </div>

            <div className="mt-4 flex justify-between items-center">
              <div className="text-xs text-gray-500">
                Estado alvo: <strong>{selectedState || 'Nenhum'}</strong>
              </div>
              <div>
                <button
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 mr-2 rounded-md bg-gray-100"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-6">
        {stats.map((item: any) => (
          <div
            key={item.state}
            className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 dark:bg-slate-900 dark:border-slate-800"
          >
            <div className="flex justify-between items-start">
              <div>
                <p className="text-gray-500 text-xs font-bold uppercase tracking-wider">
                  {item.state || 'Não Definido'}
                </p>
                <h3 className="text-2xl font-black text-gray-800 dark:text-slate-50">
                  {item.total_reps} Reps
                </h3>
              </div>

              <div
                className={`p-2 rounded-lg ${item.out_of_sync_prices > 0 ? 'bg-amber-50 text-amber-600' : 'bg-green-50 text-green-600'}`}
              >
                <AlertTriangle size={20} />
              </div>
            </div>

            <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
              <div className="flex justify-between">
                <span>Produtos Totais:</span>
                <span className="font-semibold">{item.total_products}</span>
              </div>
              <div className="flex justify-between">
                <span>Preços Defasados:</span>
                <span
                  className={`font-bold ${item.out_of_sync_prices > 0 ? 'text-red-500' : 'text-green-500'}`}
                >
                  {item.out_of_sync_prices}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Reps sem última coleção:</span>
                <span className="font-semibold">
                  {item.reps_missing_collection ?? 0}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Última atualização:</span>
                <span>
                  {item.last_sync_date
                    ? new Date(item.last_sync_date).toLocaleString()
                    : '-'}
                </span>
              </div>

              {item.brands_out_of_sync &&
                Object.keys(item.brands_out_of_sync).length > 0 && (
                  <div className="mt-3">
                    <div className="text-xs text-gray-500 mb-1">
                      Marcas com desvios:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(item.brands_out_of_sync).map(
                        ([brand, cnt]: any) => (
                          <span
                            key={brand}
                            className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-xl"
                          >
                            {brand}: {cnt}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => {
                    setSelectedState(item.state);
                    setShowModal(true);
                  }}
                  className="px-3 py-2 bg-indigo-600 text-white rounded-2xl"
                >
                  Sincronizar por Estado
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
