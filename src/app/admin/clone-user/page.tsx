'use client';

import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { toast } from 'sonner';
import SyncStatusCard from '@/components/dashboard/SyncStatusCard';

export default function CloneUserPage() {
  const supabase = createClient();
  const [users, setUsers] = useState<any[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [cloneEntries, setCloneEntries] = useState<any[]>([]);
  const [polling, setPolling] = useState(false);
  const [latestSyncJob, setLatestSyncJob] = useState<any | null>(null);

  useEffect(() => {
    async function load() {
      const { data: usersData } = await supabase
        .from('profiles')
        .select('id, full_name, email');
      setUsers(usersData || []);

      const { data: brandsData } = await supabase
        .from('products')
        .select('brand')
        .neq('brand', null);
      const brandsList = (brandsData || [])
        .map((b: any) => b.brand)
        .filter(Boolean);
      setBrands(Array.from(new Set(brandsList)));
    }
    load();
  }, []);

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
      const res = await fetch('/api/admin/setup-new-user', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          targetUserId: selectedUser,
          brands: selectedBrands,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || 'Erro');
      toast.success('Clone iniciado');
      // start polling for clone status
      setPolling(true);
    } catch (e: any) {
      console.error(e);
      toast.error(e.message || 'Erro ao iniciar clone');
    } finally {
      setLoading(false);
    }
  };

  // Poll catalog_clones for the selected target user
  useEffect(() => {
    let mounted = true;
    let interval: ReturnType<typeof setInterval> | null = null;

    const fetchClones = async () => {
      if (!selectedUser) return;
      try {
        const { data } = await supabase
          .from('catalog_clones')
          .select(
            'id,source_product_id,cloned_product_id,source_user_id,target_user_id,created_at'
          )
          .eq('target_user_id', selectedUser)
          .order('created_at', { ascending: false })
          .limit(200);
        if (!mounted) return;
        setCloneEntries(data || []);
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
      } catch (err) {
        // ignore
      }
    };

    if (selectedUser && polling) {
      fetchClones();
      interval = setInterval(fetchClones, 3000);
    } else if (selectedUser) {
      // fetch once when user changes
      fetchClones();
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
            {brands.map((b) => (
              <label key={b} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedBrands.includes(b)}
                  onChange={() => toggleBrand(b)}
                />
                <span className="text-sm">{b}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
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

      {/* Clone console */}
      {selectedUser && (
        <div className="mt-6">
          <SyncStatusCard syncData={latestSyncJob} />
          <div className="mt-4 bg-white dark:bg-slate-900 p-3 rounded border border-gray-100 dark:border-slate-800 text-sm text-gray-600">
            {cloneEntries.length === 0
              ? 'Nenhum item clonado ainda.'
              : `${cloneEntries.length} itens clonados (mostrando até 200).`}
            <div className="mt-2">
              <button
                onClick={() => setCloneEntries((e) => [...e])}
                className="underline"
              >
                Atualizar lista
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
