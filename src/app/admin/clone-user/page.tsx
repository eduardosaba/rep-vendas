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
  const [cloneProgress, setCloneProgress] = useState<{
    active: boolean;
    count: number;
    startTime: number | null;
  }>({ active: false, count: 0, startTime: null });
  const [lastInsertTime, setLastInsertTime] = useState<number | null>(null);
  const PROPERTY_OPTIONS: { key: string; label: string }[] = [
    { key: 'price', label: 'Preço Custo' },
    { key: 'sale_price', label: 'Preço de Vendas' },
    { key: 'is_active', label: 'Status Ativo/inativo' },
    { key: 'is_launch', label: 'Lançamento' },
    { key: 'is_best_seller', label: 'Best Seller' },
    { key: 'description', label: 'Descrição' },
    { key: 'barcode', label: 'Código de barras' },
    { key: 'technical_specs', label: 'Ficha Técnica' },
    { key: 'color', label: 'Cor' },
    { key: 'stock_quantity', label: 'Estoque Quantidade' },
  ];
  const [brandSearchTerm, setBrandSearchTerm] = useState('');
  const [showOnlyPending, setShowOnlyPending] = useState(false);
  const PAGE_SIZE = 200;

  // Global unhandled rejection handler (shared across effects)
  const onUnhandled = (ev: PromiseRejectionEvent) => {
    try {
      console.error('[CloneUserPage] Unhandled rejection:', ev.reason);
      try {
        toast.error(
          'Erro não tratado detectado. Veja o console para detalhes.'
        );
      } catch (e) {}
    } catch (e) {
      // ignore
    }
  };

  // Confirmation dialog state (promise-based)
  const [confirmState, setConfirmState] = useState<{
    open: boolean;
    title?: string;
    message?: string;
    resolve?: (v: boolean) => void;
  }>({ open: false });

  const askConfirm = (message: string, title?: string) =>
    new Promise<boolean>((resolve) => {
      setConfirmState({ open: true, message, title, resolve });
    });
  useEffect(() => {
    async function load() {
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, email');
      setUsers(usersData || []);

      // Fetch products grouped by brand but also include owner (user_id)
      const { data: productsData } = await supabase
        .from('products')
        .select('brand, updated_at, user_id')
        .not('brand', 'is', null);

      // Build map: brand -> { countsByUser: { userId: count }, latestByUser: { userId: latestDate } }
      const brandAgg: Record<
        string,
        {
          countsByUser: Record<string, number>;
          latestByUser: Record<string, string | null>;
        }
      > = {};

      const userIds = new Set<string>();
      (productsData || []).forEach((p: any) => {
        const b = p.brand;
        if (!b) return;
        const uid = String(p.user_id || '');
        userIds.add(uid);
        if (!brandAgg[b]) brandAgg[b] = { countsByUser: {}, latestByUser: {} };
        brandAgg[b].countsByUser[uid] =
          (brandAgg[b].countsByUser[uid] || 0) + 1;
        const u = p.updated_at;
        const prev = brandAgg[b].latestByUser[uid];
        if (u && (!prev || new Date(u) > new Date(prev))) {
          brandAgg[b].latestByUser[uid] = u;
        }
      });

      // Fetch profiles for these userIds to detect template users (role === 'template')
      const ids = Array.from(userIds).filter(Boolean);
      let profilesById: Record<string, any> = {};
      if (ids.length > 0) {
        try {
          const { data: profiles } = await supabase
            .from('profiles')
            .select('id, role')
            .in('id', ids as any[]);
          (profiles || []).forEach((pr: any) => {
            profilesById[String(pr.id)] = pr;
          });
        } catch (e) {
          // ignore profile lookup failures — fallback behavior below
        }
      }

      const map: Record<
        string,
        { count: number; latestUpdatedAt: string | null }
      > = {};

      Object.entries(brandAgg).forEach(([brand, info]) => {
        const userCounts = info.countsByUser;
        const userLatest = info.latestByUser;

        // Prefer a template user if present
        const templateUser = Object.keys(userCounts).find(
          (uid) => profilesById[uid] && profilesById[uid].role === 'template'
        );

        let chosenUser = templateUser || null;

        if (!chosenUser) {
          const owners = Object.keys(userCounts);
          if (owners.length === 1) chosenUser = owners[0];
          else if (owners.length > 1) {
            // Multiple owners: choose the owner with the largest single count (do NOT sum)
            chosenUser = owners.reduce(
              (max, uid) =>
                userCounts[uid] > (userCounts[max] || 0) ? uid : max,
              owners[0]
            );
          }
        }

        if (chosenUser) {
          map[brand] = {
            count: userCounts[chosenUser] || 0,
            latestUpdatedAt: userLatest[chosenUser] || null,
          };
        } else {
          // No owner (shouldn't happen) — fallback to total count and latest across users
          const total = Object.values(userCounts).reduce((s, v) => s + v, 0);
          const latest = Object.values(userLatest).reduce(
            (best, v) =>
              !best || (v && new Date(v) > new Date(best)) ? v : best,
            null as string | null
          );
          map[brand] = { count: total, latestUpdatedAt: latest };
        }
      });

      setBrands(Object.keys(map).sort());
      setBrandsData(map);
    }
    load();
    // attach global handler
    window.addEventListener('unhandledrejection', onUnhandled as any);
    return () =>
      window.removeEventListener('unhandledrejection', onUnhandled as any);
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
        body: JSON.stringify({ source_user_id: user.id }),
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
          source_user_id: user.id,
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

  const fetchBrandStats = async () => {
    if (!selectedUser) return;
    try {
      const { data, error } = await supabase.rpc('get_brand_clone_stats', {
        p_target_user_id: selectedUser,
      });

      if (error) throw error;

      const statsMap: any = {};
      (data || []).forEach((row: any) => {
        statsMap[row.brand_name] = {
          clonedCount: Number(row.cloned_count),
          latestCloneAt: row.latest_clone_at,
        };
      });

      setBrandsData((prev) => {
        const next = { ...prev };
        Object.keys(statsMap).forEach((b) => {
          if (!next[b]) next[b] = { count: 0, latestUpdatedAt: null };
          next[b].clonedCount = statsMap[b].clonedCount;
          next[b].latestCloneAt = statsMap[b].latestCloneAt;
        });
        return next;
      });
    } catch (e) {
      console.warn(
        '[CloneUserPage] RPC get_brand_clone_stats failed, falling back to client aggregation',
        e
      );

      try {
        // Fallback: aggregate from catalog_clones + products
        const { data: clones } = await supabase
          .from('catalog_clones')
          .select('cloned_product_id, created_at')
          .eq('target_user_id', selectedUser);

        const prodIds = (clones || [])
          .map((c: any) => c.cloned_product_id)
          .filter(Boolean);

        const { data: prods } = prodIds.length
          ? await supabase.from('products').select('id,brand').in('id', prodIds)
          : { data: [] };

        const brandAgg: Record<
          string,
          { clonedCount: number; latestCloneAt: string | null }
        > = {};
        (clones || []).forEach((c: any) => {
          const p = (prods || []).find(
            (x: any) => String(x.id) === String(c.cloned_product_id)
          );
          const brand = (p && p.brand) || 'N/A';
          if (!brandAgg[brand])
            brandAgg[brand] = { clonedCount: 0, latestCloneAt: null };
          brandAgg[brand].clonedCount += 1;
          const created = c.created_at;
          if (
            created &&
            (!brandAgg[brand].latestCloneAt ||
              new Date(created) > new Date(brandAgg[brand].latestCloneAt))
          ) {
            brandAgg[brand].latestCloneAt = created;
          }
        });

        setBrandsData((prev) => {
          const next = { ...prev };
          Object.keys(brandAgg).forEach((b) => {
            if (!next[b]) next[b] = { count: 0, latestUpdatedAt: null };
            next[b].clonedCount = brandAgg[b].clonedCount;
            next[b].latestCloneAt = brandAgg[b].latestCloneAt;
          });
          return next;
        });
      } catch (e2) {
        console.error('[CloneUserPage] fallback fetchBrandStats failed:', e2);
      }
    }
  };

  const handleViewHistory = async (offset = 0) => {
    if (!selectedUser) return toast.error('Selecione um usuário primeiro');

    try {
      setLoadingHistory(true);
      setShowHistory(true);

      // Try view first (if exists). If it fails, fallback to aggregating from catalog_clones + products + profiles
      let useData: any[] = [];
      let totalCount: number | null = null;

      try {
        const { data, error, count } = await supabase
          .from('v_history_clones')
          .select('*', { count: 'exact' })
          .eq('target_user_id', selectedUser)
          .order('cloned_at', { ascending: false })
          .range(offset, offset + 49);

        if (!error && data) {
          useData = data;
          totalCount = typeof count === 'number' ? count : null;
        } else if (error) {
          throw error;
        }
      } catch (viewErr) {
        console.warn(
          '[CloneUserPage] view v_history_clones unavailable, using fallback',
          viewErr
        );

        const { data: clones } = await supabase
          .from('catalog_clones')
          .select(
            'id, source_product_id, cloned_product_id, source_user_id, target_user_id, created_at'
          )
          .eq('target_user_id', selectedUser)
          .order('created_at', { ascending: false })
          .range(offset, offset + 49);

        const prodIds = (clones || [])
          .map((c: any) => c.cloned_product_id)
          .filter(Boolean);
        const srcUserIds = Array.from(
          new Set(
            (clones || []).map((c: any) => c.source_user_id).filter(Boolean)
          )
        );

        const { data: prods } = prodIds.length
          ? await supabase
              .from('products')
              .select('id,name,brand,reference_code')
              .in('id', prodIds)
          : { data: [] };

        const { data: profiles } = srcUserIds.length
          ? await supabase
              .from('profiles')
              .select('id,email')
              .in('id', srcUserIds)
          : { data: [] };

        useData = (clones || []).map((c: any) => {
          const p =
            (prods || []).find(
              (x: any) => String(x.id) === String(c.cloned_product_id)
            ) || ({} as any);
          const pr =
            (profiles || []).find(
              (x: any) => String(x.id) === String(c.source_user_id)
            ) || ({} as any);
          return {
            clone_id: c.id,
            product_name: (p as any).name || null,
            brand: (p as any).brand || null,
            reference_code: (p as any).reference_code || null,
            cloned_at: c.created_at,
            source_user_email: (pr as any).email || null,
          };
        });

        // Attempt to fetch total count for pagination
        try {
          const { count } = await supabase
            .from('catalog_clones')
            .select('id', { count: 'exact', head: true })
            .eq('target_user_id', selectedUser);
          totalCount = typeof count === 'number' ? count : null;
        } catch (_) {
          totalCount = null;
        }
      }

      setCloneHistory(
        offset === 0 ? useData || [] : [...cloneHistory, ...(useData || [])]
      );

      if (totalCount !== null) {
        setCloneStats({
          total_clones: totalCount,
          total_brands: 0,
        });
      }
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || 'Erro ao carregar histórico');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleUndoClone = async () => {
    if (!selectedUser) return toast.error('Selecione um usuário primeiro');

    const confirmed = await askConfirm(
      `⚠️ ATENÇÃO: Isso irá DELETAR todos os produtos clonados do usuário selecionado.\n\n` +
        `Marcas afetadas: ${selectedBrands.length > 0 ? selectedBrands.join(', ') : 'TODAS'}\n\n` +
        `Esta ação NÃO pode ser desfeita.\n\nDeseja continuar?`,
      'Desfazer Clonagem'
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
    try {
      setSyncingProps(true);
      const session = await supabase.auth.getSession();
      const token = session?.data?.session?.access_token;

      // First: dry-run to show impact
      const dryRes = await fetch('/api/admin/sync-properties', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          targetUserId: selectedUser,
          brands: selectedBrands.length > 0 ? selectedBrands : null,
          properties: selectedProperties,
          dryRun: true,
        }),
      });

      const dryJson = await dryRes.json();
      if (!dryRes.ok) throw new Error(dryJson.error || 'Erro no dry-run');

      const summary =
        dryJson.message ||
        `${dryJson.updatedProducts || 0} produtos afetados em ${dryJson.affectedUsers || 0} usuários.`;

      const confirmed = await askConfirm(
        `Dry-run: ${summary}\n\nDeseja aplicar as alterações agora?`,
        'Confirmar Sincronização'
      );

      if (!confirmed) {
        toast('Sincronização cancelada');
        return;
      }

      // Apply
      const applyRes = await fetch('/api/admin/sync-properties', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          targetUserId: selectedUser,
          brands: selectedBrands.length > 0 ? selectedBrands : null,
          properties: selectedProperties,
          dryRun: false,
        }),
      });

      const applyJson = await applyRes.json();
      if (!applyRes.ok)
        throw new Error(applyJson.error || 'Erro ao aplicar sincronização');

      toast.success('Propriedades sincronizadas!', {
        description: applyJson.message,
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
      // Align with NewUserSetup: simple JSON request/response handling
      const payload = {
        targetUserId: selectedUser,
        brands: selectedBrands,
      };

      const res = await fetch('/api/admin/setup-new-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);
      if (!res.ok)
        throw new Error(
          json?.error || json?.message || 'Erro ao iniciar clone'
        );

      toast.success(json?.message || 'Clone iniciado');
      // start polling for clone status
      setPolling(true);
      // Try to extract returned copied count from RPC response to show progress
      let copiedCount = 0;
      try {
        if (json) {
          if (Array.isArray(json.data) && json.data.length > 0) {
            copiedCount = Number(json.data[0]?.copied_count || 0);
          } else if (typeof json.data === 'object' && json.data !== null) {
            copiedCount = Number(
              json.data.copied_count || json.data.copiedCount || 0
            );
          } else if (typeof json.data === 'number') {
            copiedCount = Number(json.data || 0);
          }
        }
      } catch (e) {
        copiedCount = 0;
      }

      setCloneProgress({
        active: true,
        count: copiedCount,
        startTime: Date.now(),
      });
      setLastInsertTime(Date.now());
    } catch (e: any) {
      console.error(e);
      // Prefer human-friendly message, fallback to generic
      const message = e?.message || String(e) || 'Erro ao iniciar clone';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  // Poll catalog_clones for the selected target user (optimized with RPC + Realtime)
  useEffect(() => {
    let channel: any = null;

    const initData = async () => {
      if (selectedUser) {
        setCloneOffset(0);
        await loadClones(0, false);
        await fetchBrandStats();
      }
    };

    // Initial fetch when user changes
    if (selectedUser) {
      initData();
    }

    // Subscribe to Realtime only if polling/console is active
    if (selectedUser && polling) {
      channel = supabase
        .channel('schema-db-changes')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'catalog_clones',
            filter: `target_user_id=eq.${selectedUser}`,
          },
          (payload) => {
            // Append new clone to head
            setCloneEntries((prev) => [payload.new, ...prev]);
            // Refresh stats efficiently
            fetchBrandStats();
            // Update progress counter
            setCloneProgress((prev) => ({
              ...prev,
              count: prev.count + 1,
            }));
            // Mark last insert time for completion detection
            setLastInsertTime(Date.now());
          }
        )
        .subscribe();
    }

    return () => {
      if (channel) supabase.removeChannel(channel);
    };
  }, [selectedUser, polling]);

  // Detect clone completion (no new inserts for 5 seconds)
  useEffect(() => {
    if (!cloneProgress.active || !lastInsertTime) return;

    const timer = setTimeout(() => {
      const now = Date.now();
      if (now - lastInsertTime >= 5000) {
        // 5 seconds of inactivity
        setCloneProgress((prev) => ({ ...prev, active: false }));
        setPolling(false);
        toast.success('Clone concluído com sucesso! 🎉', {
          description: `${cloneProgress.count} produtos clonados`,
        });
      }
    }, 5500);

    return () => clearTimeout(timer);
  }, [lastInsertTime, cloneProgress.active, cloneProgress.count]);

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
          <label className="block text-sm font-medium mb-1">Marcas</label>
          <div className="flex flex-col gap-2 mb-2">
            <input
              type="text"
              placeholder="Buscar marca..."
              value={brandSearchTerm}
              onChange={(e) => setBrandSearchTerm(e.target.value)}
              className="w-full text-sm border rounded px-2 py-1"
            />
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showOnlyPending}
                onChange={(e) => setShowOnlyPending(e.target.checked)}
                className="rounded text-blue-600 focus:ring-blue-500"
              />
              Mostrar apenas marcas com atualizações pendentes
            </label>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 max-h-64 overflow-auto border rounded p-3 bg-gray-50 dark:bg-slate-800/50">
            {brands
              .filter((b) => {
                const meta = brandsData[b] || {
                  count: 0,
                  latestUpdatedAt: null,
                };
                const needsUpdate =
                  meta.latestUpdatedAt && meta.latestCloneAt
                    ? new Date(meta.latestUpdatedAt) >
                      new Date(meta.latestCloneAt)
                    : false;

                if (showOnlyPending && !needsUpdate) return false;
                if (
                  brandSearchTerm &&
                  !b.toLowerCase().includes(brandSearchTerm.toLowerCase())
                )
                  return false;
                return true;
              })
              .map((b) => {
                const meta = brandsData[b] || {
                  count: 0,
                  latestUpdatedAt: null,
                };
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
                      <span className="text-sm truncate max-w-[220px]">
                        {b}
                      </span>
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

      {/* Clone Progress Banner */}
      {cloneProgress.active && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="animate-spin text-2xl">🔄</div>
              <div>
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  Clonagem em andamento...
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {cloneProgress.count} produtos clonados até agora
                </p>
              </div>
            </div>
            <button
              onClick={() => {
                setCloneProgress({ active: false, count: 0, startTime: null });
                setPolling(false);
                toast(
                  'Monitoramento interrompido (clone continua em segundo plano)'
                );
              }}
              className="px-3 py-1 bg-blue-200 dark:bg-blue-800 text-blue-900 dark:text-blue-100 rounded text-sm hover:bg-blue-300 dark:hover:bg-blue-700"
            >
              Parar Monitoramento
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 grid md:grid-cols-2 gap-6">
        <div>
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-3">
              <button
                onClick={handleSubmit}
                disabled={loading || cloneProgress.active}
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
                    onClick={() => handleViewHistory(0)}
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
                      {PROPERTY_OPTIONS.map((opt) => (
                        <label
                          key={opt.key}
                          className="flex items-center gap-1 text-xs"
                        >
                          <input
                            type="checkbox"
                            checked={selectedProperties.includes(opt.key)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedProperties((prev) => [
                                  ...prev,
                                  opt.key,
                                ]);
                              } else {
                                setSelectedProperties((prev) =>
                                  prev.filter((p) => p !== opt.key)
                                );
                              }
                            }}
                          />
                          <span>{opt.label}</span>
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

      {/* Confirmation Modal (in-page, consistent styling) */}
      {confirmState.open && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white dark:bg-slate-900 rounded-lg p-6 max-w-lg w-full">
            {confirmState.title && (
              <h3 className="text-lg font-semibold mb-2 text-gray-900 dark:text-white">
                {confirmState.title}
              </h3>
            )}
            <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-line">
              {confirmState.message}
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => {
                  try {
                    confirmState.resolve?.(false);
                  } finally {
                    setConfirmState({ open: false });
                  }
                }}
                className="px-4 py-2 bg-gray-200 dark:bg-slate-700 rounded text-gray-700 dark:text-gray-200"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  try {
                    confirmState.resolve?.(true);
                  } finally {
                    setConfirmState({ open: false });
                  }
                }}
                className="px-4 py-2 bg-red-600 text-white rounded"
              >
                Confirmar
              </button>
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
                  <div className="text-gray-500">
                    🔄 Carregando histórico...
                  </div>
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
