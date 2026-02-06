'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import SyncStatusCard from '@/components/dashboard/SyncStatusCard';
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
          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-[var(--primary)] text-white rounded"
            >
              {loading ? 'Iniciando...' : 'Clonar catálogo'}
            </button>
            <button
              onClick={() => {
                // toggle polling manually
                setPolling((p) => !p);
              }}
              className="ml-3 px-4 py-2 bg-white border text-gray-700 rounded"
            >
              {polling ? 'Parar Console' : 'Abrir Console de Clonagem'}
            </button>
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
    </div>
  );
}
