'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import SyncBrandPanel from '@/components/admin/SyncBrandPanel';

export default function CloneUserPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<any[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [brandsData, setBrandsData] = useState<
    Record<
      string,
      {
        count: number;
        latestUpdatedAt: string | null;
        clonedCount?: number;
        latestCloneAt?: string | null;
      }
    >
  >({});
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [cloneEntries, setCloneEntries] = useState<any[]>([]);
  const [polling, setPolling] = useState(false);
  const [latestSyncJob, setLatestSyncJob] = useState<any | null>(null);
  const [cloneTotal, setCloneTotal] = useState<number | null>(null);
  const [cloneOffset, setCloneOffset] = useState(0);
  const [syncingAll, setSyncingAll] = useState(false);
  const [syncingByBrand, setSyncingByBrand] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [cloneHistory, setCloneHistory] = useState<any[]>([]);
  const [cloneStats, setCloneStats] = useState<any>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [undoingClone, setUndoingClone] = useState(false);
  const [syncingProps, setSyncingProps] = useState(false);
  const [selectedProperties, setSelectedProperties] = useState<string[]>([
    'price',
    'sale_price',
    'is_active',
  ]);
  const PAGE_SIZE = 200;

  useEffect(() => {
    async function load() {
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, email');
      setUsers(usersData || []);

      const { data: productsData } = await supabase
        .from('products')
        .select('brand, updated_at')
        .neq('brand', null);

      const map: Record<
        string,
        { count: number; latestUpdatedAt: string | null }
      > = {};
      (productsData || []).forEach((p: any) => {
        const b = p.brand;
        if (!b) return;
        if (!map[b]) map[b] = { count: 0, latestUpdatedAt: null };
        map[b].count += 1;
        const u = p.updated_at;
        if (
          u &&
          (!map[b].latestUpdatedAt ||
            new Date(u) > new Date(map[b].latestUpdatedAt))
        ) {
          map[b].latestUpdatedAt = u;
        }
      });

      // Global handler to surface unhandled promise rejections while on this page
      useEffect(() => {
        const onUnhandled = (ev: PromiseRejectionEvent) => {
          try {
            console.error('[CloneUserPage] Unhandled rejection:', ev.reason);
            // Show lightweight toast so user knows something failed silently
            try {
              toast.error(
                'Erro não tratado detectado. Veja o console para detalhes.'
              );
            } catch (e) {}
          } catch (e) {
            // ignore
          }
        };
        window.addEventListener('unhandledrejection', onUnhandled as any);
        return () =>
          window.removeEventListener('unhandledrejection', onUnhandled as any);
      }, []);
      setBrands(Object.keys(map).sort());
      setBrandsData(map);
    }
    load();
  }, []);

  // Load clones helper (reusable outside effect)
  const loadClones = async (offset = 0, append = false) => {
    if (!selectedUser) return;
    try {
      const query = supabase
        .from('catalog_clones')
        .select(
          'id,source_product_id,cloned_product_id,source_user_id,target_user_id,created_at',
          { count: 'exact' }
        )
        .eq('target_user_id', selectedUser)
        .order('created_at', { ascending: false });

      const start = offset;
      const end = offset + PAGE_SIZE - 1;
      const { data, count } = await query.range(start, end);
      if (!data) return { data: [], count: null };
      if (append) setCloneEntries((prev) => [...prev, ...(data || [])]);
      else setCloneEntries(data || []);
      setCloneTotal(typeof count === 'number' ? count : null);
      setCloneOffset(offset + (data?.length || 0));
      return { data, count };
    } catch (err) {
      console.error('Erro ao carregar clones:', err);
    }
  };

  const toggleBrand = (b: string) => {
    setSelectedBrands((prev) =>
      prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
    );
  };

  const handleSyncAll = async () => {
    try {
      setSyncingAll(true);
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return toast.error('Sessão expirada');

      const res = await fetch('/api/admin/sync-catalog-updates', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({ masterUserId: user.id }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao sincronizar');

      const total =
        result.data?.reduce(
          (sum: number, r: any) => sum + (r.products_added || 0),
          0
        ) || 0;
      const targets = result.data?.length || 0;

      toast.success(`Sincronização concluída!`, {
        description: `${total} produtos adicionados para ${targets} representante(s)`,
      });

      // Refresh clone data
      if (selectedUser) loadClones(0, false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erro ao sincronizar lançamentos');
    } finally {
      setSyncingAll(false);
    }
  };

  const handleSyncByBrand = async () => {
    if (selectedBrands.length === 0)
      return toast.error('Selecione pelo menos uma marca para sincronizar');

    try {
      setSyncingByBrand(true);
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return toast.error('Sessão expirada');

      const res = await fetch('/api/admin/sync-catalog-updates', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          masterUserId: user.id,
          brands: selectedBrands,
        }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao sincronizar');

      const total =
        result.data?.reduce(
          (sum: number, r: any) => sum + (r.products_added || 0),
          0
        ) || 0;
      const targets = result.data?.length || 0;

      toast.success(`Sincronização por marca concluída!`, {
        description: `${total} produtos (${selectedBrands.join(', ')}) adicionados para ${targets} representante(s)`,
      });

      // Refresh clone data
      if (selectedUser) loadClones(0, false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erro ao sincronizar por marca');
    } finally {
      setSyncingByBrand(false);
    }
  };

  const handleViewHistory = async () => {
    if (!selectedUser) return toast.error('Selecione um usuário primeiro');
    
    try {
      setLoadingHistory(true);
      setShowHistory(true);
      
      const res = await fetch(
        `/api/admin/clone-history?targetUserId=${selectedUser}&limit=200`
      );
      
      if (!res.ok) throw new Error('Erro ao buscar histórico');
      
      const data = await res.json();
      setCloneHistory(data.history || []);
      setCloneStats(data.stats || null);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erro ao carregar histórico');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleUndoClone = async () => {
    if (!selectedUser) return toast.error('Selecione um usuário primeiro');
    
    const confirmed = confirm(
      `⚠️ ATENÇÃO: Isso irá DELETAR todos os produtos clonados do usuário selecionado.\n\n` +
      `Marcas afetadas: ${selectedBrands.length > 0 ? selectedBrands.join(', ') : 'TODAS'}\n\n` +
      `Esta ação NÃO pode ser desfeita.\n\nDeseja continuar?`
    );
    
    if (!confirmed) return;
    
    try {
      setUndoingClone(true);
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      
      const res = await fetch('/api/admin/undo-clone', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          targetUserId: selectedUser,
          brands: selectedBrands.length > 0 ? selectedBrands : null,
        }),
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao desfazer clone');
      
      toast.success(`Clone desfeito com sucesso!`, {
        description: `${result.deletedCount} produtos removidos`,
      });
      
      // Refresh data
      loadClones(0, false);
      if (showHistory) handleViewHistory();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erro ao desfazer clone');
    } finally {
      setUndoingClone(false);
    }
  };

  const handleSyncProperties = async () => {
    if (!selectedUser) return toast.error('Selecione um usuário primeiro');
    if (selectedProperties.length === 0)
      return toast.error('Selecione pelo menos uma propriedade');
    
    const confirmed = confirm(
      `Sincronizar as seguintes propriedades para os produtos clonados?\n\n` +
      `Propriedades: ${selectedProperties.join(', ')}\n` +
      `Usuário: ${users.find((u) => u.id === selectedUser)?.full_name || selectedUser}\n` +
      `Marcas: ${selectedBrands.length > 0 ? selectedBrands.join(', ') : 'TODAS'}`
    );
    
    if (!confirmed) return;
    
    try {
      setSyncingProps(true);
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      
      const res = await fetch('/api/admin/sync-properties', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          targetUserId: selectedUser,
          brands: selectedBrands.length > 0 ? selectedBrands : null,
          properties: selectedProperties,
        }),
      });
      
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Erro ao sincronizar propriedades');
      
      toast.success(`Propriedades sincronizadas!`, {
        description: result.message,
      });
      
      loadClones(0, false);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erro ao sincronizar propriedades');
    } finally {
      setSyncingProps(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedUser) return toast.error('Selecione um usuário alvo');
    if (selectedBrands.length === 0)
      return toast.error('Selecione pelo menos uma marca');
    setLoading(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;
      const payload = { targetUserId: selectedUser, brands: selectedBrands };

      const res = await fetch('/api/admin/setup-new-user', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(payload),
      });

      // Try to read response as text first (safe), then parse JSON if possible
      let textBody: string | null = null;
      let jsonBody: any = null;
      try {
        textBody = await res.text();
        try {
          jsonBody = textBody ? JSON.parse(textBody) : null;
        } catch (e) {
          jsonBody = null; // not JSON
        }
      } catch (e) {
        console.error('[CloneUserPage] failed to read response body', e);
      }

      if (!res.ok) {
        console.error('[CloneUserPage] setup-new-user failed', {
          status: res.status,
          statusText: res.statusText,
          body: textBody,
        });
        const errMsg =
          jsonBody?.error ||
          jsonBody?.message ||
          `Erro: ${res.status} ${res.statusText}`;
        throw new Error(String(errMsg));
      }

      // If API returned an error shape inside 200, respect it
      if (jsonBody && (jsonBody.error || jsonBody.success === false)) {
        console.error(
          '[CloneUserPage] setup-new-user returned error payload',
          jsonBody
        );
        const errMsg =
          jsonBody.error || jsonBody.message || 'Erro ao iniciar clone';
        throw new Error(String(errMsg));
      }

      toast.success('Clone iniciado');
      // start polling for clone status
      setPolling(true);
    } catch (e: any) {
      console.error(e);
      // Prefer human-friendly message, fallback to generic
      const message = e?.message || String(e) || 'Erro ao iniciar clone';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Poll catalog_clones for the selected target user
  useEffect(() => {
    let mounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    const fetchClones = async (offset = 0) => {
      if (!selectedUser) return;
      try {
        const res = await loadClones(offset, offset !== 0);
        const data = res?.data || [];
        // also fetch latest sync job for this target user and update
        try {
          const { data: job } = await supabase
            .from('sync_jobs')
            .select('*')
            .eq('user_id', selectedUser)
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle();
          if (mounted) setLatestSyncJob(job || null);
        } catch (e) {
          // ignore
        }
        // compute per-brand clone stats by fetching source products referenced in clones
        try {
          const sourceIds = (data || [])
            .map((c: any) => c.source_product_id)
            .filter(Boolean);
          if (sourceIds.length > 0) {
            const { data: srcProducts } = await supabase
              .from('products')
              .select('id,brand,updated_at')
              .in('id', sourceIds as any[]);

            const perBrand: Record<
              string,
              { clonedCount: number; latestCloneAt: string | null }
            > = {};
            (data || []).forEach((c: any) => {
              const src = (srcProducts || []).find(
                (p: any) => p.id === c.source_product_id
              );
              const brand = src?.brand || 'Sem marca';
              if (!perBrand[brand])
                perBrand[brand] = { clonedCount: 0, latestCloneAt: null };
              perBrand[brand].clonedCount += 1;
              const created = c.created_at;
              if (
                created &&
                (!perBrand[brand].latestCloneAt ||
                  new Date(created) > new Date(perBrand[brand].latestCloneAt))
              ) {
                perBrand[brand].latestCloneAt = created;
              }
            });

            // merge into brandsData
            setBrandsData((prev) => {
              const next = { ...prev };
              Object.entries(perBrand).forEach(([b, stats]) => {
                if (!next[b]) next[b] = { count: 0, latestUpdatedAt: null };
                next[b].clonedCount = stats.clonedCount;
                next[b].latestCloneAt = stats.latestCloneAt;
              });
              return next;
            });
          }
        } catch (e) {
          console.error(
            '[CloneUserPage] error computing per-brand clone stats',
            e
          );
        }
      } catch (err) {
        console.error('[CloneUserPage] error fetching clones', err);
      }
    };

    if (selectedUser && polling) {
      fetchClones(0);
      interval = setInterval(() => fetchClones(0), 3000);
    } else if (selectedUser) {
      // fetch once when user changes (reset offset)
      setCloneOffset(0);
      fetchClones(0);
    }

    return () => {
      mounted = false;
      if (interval) clearInterval(interval);
    };
  }, [selectedUser, polling]);

  return (
    <div className="p-6">
      <h2 className="text-lg font-bold mb-4">
        Setup: Clonar catálogo para novo usuário
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-2">Usuário alvo</label>
          <select
            value={selectedUser ?? ''}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="">-- selecione --</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name || u.email}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Marcas</label>
          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-auto border rounded p-2">
            {brands.map((b) => {
              const meta = brandsData[b] || { count: 0, latestUpdatedAt: null };
              const cloned = meta.clonedCount || 0;
              const needsUpdate =
                meta.latestUpdatedAt && meta.latestCloneAt
                  ? new Date(meta.latestUpdatedAt) >
                    new Date(meta.latestCloneAt)
                  : false;
              return (
                <label
                  key={b}
                  className="flex items-center gap-2 justify-between w-full"
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(b)}
                      onChange={() => toggleBrand(b)}
                    />
                    <span className="text-sm">{b}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                      {meta.count} itens
                    </span>
                    {cloned > 0 && (
                      <span className="text-xs text-green-600">
                        {cloned} clonados
                      </span>
                    )}
                    {needsUpdate && (
                      <span className="text-xs text-amber-600 font-bold">
                        Atualizações pendentes
                      </span>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mt-4 grid md:grid-cols-2 gap-6">
        <div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmit}
                disabled={loading}
                className="px-4 py-2 bg-[var(--primary)] text-white rounded disabled:opacity-50"
              >
                {loading ? 'Iniciando...' : 'Clonar catálogo'}
              </button>
              <button
                onClick={() => {
                  // toggle polling manually
                  setPolling((p) => !p);
                }}
                className="px-4 py-2 bg-white border text-gray-700 rounded"
              >
                {polling ? 'Parar Console' : 'Abrir Console de Clonagem'}
              </button>
            </div>

            <div className="border-t pt-3">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                Sincronização Incremental
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSyncAll}
                  disabled={syncingAll}
                  className="px-4 py-2 bg-green-600 text-white rounded text-sm disabled:opacity-50 hover:bg-green-700 transition-colors"
                  title="Sincroniza novos produtos do catálogo master para TODOS os representantes que já receberam clone"
                >
                  {syncingAll
                    ? '🔄 Sincronizando...'
                    : '🚀 Sincronizar Lançamentos'}
                </button>
                <button
                  onClick={handleSyncByBrand}
                  disabled={syncingByBrand || selectedBrands.length === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded text-sm disabled:opacity-50 hover:bg-blue-700 transition-colors"
                  title="Sincroniza apenas produtos das marcas selecionadas"
                >
                  {syncingByBrand
                    ? '🔄 Sincronizando...'
                    : '🎯 Sincronizar por Marca'}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                💡 Use após adicionar novos produtos ao catálogo master para
                replicá-los automaticamente aos representantes.
              </p>
            </div>

            {/* Gerenciamento de Clones */}
            <div className="border-t pt-3 mt-3">
              <p className="text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide">
                Gerenciamento de Clones
              </p>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleViewHistory}
                    disabled={loadingHistory || !selectedUser}
                    className="px-4 py-2 bg-purple-600 text-white rounded text-sm disabled:opacity-50 hover:bg-purple-700 transition-colors"
                    title="Ver histórico completo de clonagens deste usuário"
                  >
                    {loadingHistory ? '🔄 Carregando...' : '📜 Ver Histórico'}
                  </button>

                  <button
                    onClick={handleUndoClone}
                    disabled={undoingClone || !selectedUser}
                    className="px-4 py-2 bg-red-600 text-white rounded text-sm disabled:opacity-50 hover:bg-red-700 transition-colors"
                    title="Desfazer clonagem (remove produtos clonados, NÃO afeta imagens compartilhadas)"
                  >
                    {undoingClone ? '🔄 Desfazendo...' : '↩️ Desfazer Clone'}
                  </button>
                </div>

                {/* Property Sync Controls */}
                <details className="mt-2">
                  <summary className="cursor-pointer text-sm font-medium text-gray-700 hover:text-gray-900">
                    🔄 Sincronizar Propriedades Específicas
                  </summary>
                  <div className="mt-2 p-3 bg-gray-50 dark:bg-slate-800 rounded">
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">
                      Selecione quais propriedades sincronizar do catálogo
                      master para os clones:
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
                      {[
                        'price',
                        'sale_price',
                        'is_active',
                        'is_launch',
                        'is_best_seller',
                        'description',
                        'barcode',
                        'technical_specs',
                        'color',
                        'stock_quantity',
                      ].map((prop) => (
                        <label
                          key={prop}
                          className="flex items-center gap-1 text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={selectedProperties.includes(prop)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProperties((prev) => [
                                  ...prev,
                                  prop,
                                ]);
                              } else {
                                setSelectedProperties((prev) =>
                                  prev.filter((p) => p !== prop)
                                );
                              }
                            }}
                          />
                          <span>{prop.replace(/_/g, ' ')}</span>
                        </label>
                      ))}
                    </div>
                    <button
                      onClick={handleSyncProperties}
                      disabled={
                        syncingProps ||
                        selectedProperties.length === 0 ||
                        !selectedUser
                      }
                      className="px-3 py-1 bg-blue-600 text-white rounded text-sm disabled:opacity-50 hover:bg-blue-700 transition-colors"
                      title="Atualiza as propriedades selecionadas nos produtos clonados com base no catálogo master"
                    >
                      {syncingProps
                        ? '🔄 Sincronizando...'
                        : '✅ Aplicar Sincronização'}
                    </button>
                  </div>
                </details>
              </div>
            </div>
          </div>
        </div>

        <div>
          <SyncBrandPanel brands={brands} />
        </div>
      </div>

      {/* Clone console */}
      {selectedUser && (
        <div className="mt-6">
          {/* SyncStatusCard desativado temporariamente enquanto avaliamos melhorias */}
          {/* <SyncStatusCard syncData={latestSyncJob} /> */}
          <div className="mt-4 bg-white dark:bg-slate-900 p-3 rounded border border-gray-100 dark:border-slate-800 text-sm text-gray-600">
            {cloneEntries.length === 0
              ? 'Nenhum item clonado ainda.'
              : cloneTotal !== null
                ? `${cloneEntries.length} itens mostrados de ${cloneTotal} clonados.`
                : `${cloneEntries.length} itens clonados (mostrando até 200).`}
            <div className="mt-2">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    setCloneOffset(0);
                    loadClones(0, false);
                  }}
                  className="underline"
                >
                  Atualizar lista
                </button>
                {cloneTotal !== null && cloneEntries.length < cloneTotal && (
                  <button
                    onClick={async () => {
                      const offset = cloneEntries.length;
                      setCloneOffset(offset);
                      loadClones(offset, true);
                    }}
                    className="px-3 py-1 bg-slate-100 rounded"
                  >
                    Carregar Mais
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col">
            <div className="flex justify-between items-center mb-4 pb-3 border-b dark:border-slate-700">
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                📜 Histórico de Clonagem
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
              >
                ✕
              </button>
            </div>

            {cloneStats && (
              <div className="grid grid-cols-3 gap-4 mb-4 p-4 bg-gray-50 dark:bg-slate-800 rounded">
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Total de Clones
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {cloneStats.total_clones}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Marcas Clonadas
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {cloneStats.total_brands}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-600 dark:text-gray-400">
                    Último Clone
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {cloneStats.latest_clone
                      ? new Date(cloneStats.latest_clone).toLocaleString(
                          'pt-BR'
                        )
                      : '-'}
                  </p>
                </div>
              </div>
            )}

            {cloneStats?.brands_summary && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                <p className="text-xs font-semibold text-blue-800 dark:text-blue-300 mb-2">
                  Resumo por Marca:
                </p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(cloneStats.brands_summary).map(
                    ([brand, count]) => (
                      <span
                        key={brand}
                        className="px-2 py-1 bg-white dark:bg-slate-800 rounded text-xs border dark:border-slate-700"
                      >
                        <strong>{brand}:</strong> {String(count)} produtos
                      </span>
                    )
                  )}
                </div>
              </div>
            )}

            <div className="flex-1 overflow-auto">
              {loadingHistory ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-gray-500">🔄 Carregando histórico...</div>
                </div>
              ) : cloneHistory.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  Nenhum clone encontrado para este usuário.
                </div>
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 dark:bg-slate-800 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-semibold">Produto</th>
                      <th className="text-left p-2 font-semibold">Marca</th>
                      <th className="text-left p-2 font-semibold">
                        Referência
                      </th>
                      <th className="text-left p-2 font-semibold">
                        Clonado em
                      </th>
                      <th className="text-left p-2 font-semibold">Origem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cloneHistory.map((item: any, idx) => (
                      <tr
                        key={item.clone_id || idx}
                        className="border-b dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-800/50"
                      >
                        <td className="p-2">{item.product_name}</td>
                        <td className="p-2">
                          <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 rounded text-xs">
                            {item.brand}
                          </span>
                        </td>
                        <td className="p-2 text-xs text-gray-600 dark:text-gray-400">
                          {item.reference_code}
                        </td>
                        <td className="p-2 text-xs">
                          {new Date(item.cloned_at).toLocaleString('pt-BR')}
                        </td>
                        <td className="p-2 text-xs text-gray-600 dark:text-gray-400">
                          {item.source_user_email}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="mt-4 pt-3 border-t dark:border-slate-700 flex justify-end gap-2">
              <button
                onClick={() => setShowHistory(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
